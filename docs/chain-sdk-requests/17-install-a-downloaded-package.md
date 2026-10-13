# Capability Request 17 — Download and unpack a package Lazify can run

Source: the Lazify rewrite to Chain, ticket 029 (extensions), 2026-10-14.

**Not part of this request:**
- Running anything. Lazify starts the language server itself with
  `process-runner`, using the user's own `java` or `node`.
- Signature checks beyond a sha256, and any registry logic. Lazify talks
  to Open VSX itself with `desktop.http`.
- Making files executable. Nothing in a VSIX needs a mode bit; Electron
  wrote plain files.

## Why this needs a change in Chain

Lazify's Extensions page installs two VS Code extensions from Open VSX,
SonarLint and Tailwind CSS IntelliSense, only to run the language server
each one ships (ticket 030 lints with them). Electron Lazify streams the
`.vsix` with progress, then unzips it into `userData/extensions/<id>/<version>/`
(`src/main/extensions/{registry,archive,manager}.ts`):

```ts
const reader = response.body.getReader();
for (;;) {
  const { done, value } = await reader.read();
  if (done) break;
  armStallTimer();                       // abort after 30 s without data
  chunks.push(value);
  onProgress((received += value.byteLength), totalBytes);
}
// … then unzip: regular files only, an entry whose path leaves the target is skipped
```

The SonarLint package is **177 MB** (`SonarSource.sonarlint-vscode-6.1.0.vsix`,
Content-Length 176,650,008). On Chain today the only download is
`desktop.http` with `responseType: "bytes"`: the whole body in memory,
across IPC in one buffer, with no progress, then an unzip in the webview.
That is minutes of a frozen progress bar on a slow connection, then
hundreds of MB held in the webview while the UI thread unzips. The
contract says so itself: "**No downloads to disk.** … `desktop.models`
handles large downloads straight to disk."

`desktop.models` is very close: streamed to a temp file, sha256 checked,
`zip` extracted with symlinks and `..` paths refused, progress every
~100 ms, atomic replace, `cancel`. Two things stop Lazify using it:

- **"Paths are never returned."** Lazify has to start the server from
  the unpacked folder (`java -jar <root>/extension/server/sonarlint-ls.jar`,
  `node <root>/extension/dist/tailwindServer.js`) and check that file is
  there after installing.
- **"nothing downloaded is ever run."** A language server is exactly
  code that is run, once the user has chosen to install it. That's a
  different promise from the models capability's, so Lazify shouldn't
  stretch it without Chain deciding to.

## What Lazify needs

- Download an `https://` URL to a folder Lazify can then read and run
  from (an app folder, e.g. under `appFolder("data")`), streamed to disk.
- Progress while it downloads: bytes received and the total when the
  server says, often enough to move a progress bar (Electron reported
  every chunk). A stall with no data for a while fails the install.
- A sha256 to check (Open VSX publishes one per file).
- Unpack the `.zip` into that folder: plain files and folders only, an
  entry that would land outside the folder refused (Electron skipped
  them), nothing made executable.
- Replacing an installed version leaves no mix of old and new files;
  a failed or cancelled install leaves nothing behind.
- Cancel a running install.
- The folder's path, so `process-runner` can start the server in it.

Whether this is `models` with a "runnable package" mode, or something
new, is Chain's call.

## How Lazify will use it

`installExtension` in `src/shared/lib/extensions/manager.ts` (ported
from Electron): fetch the latest release from Open VSX, install the
package with progress feeding the existing install job (`downloading`,
`unpacking`, `done`/`failed`), check the server file is there, record the
version. Tailwind (1.8 MB) could use `http` bytes today, but one path for
both is simpler, so ticket 029 waits on this.
