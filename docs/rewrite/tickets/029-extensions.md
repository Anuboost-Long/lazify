# 029 — Extensions (Phase 5 / In progress: install waits on request 17)

**Read this whole ticket before touching code.** The Extensions page on
Chain: the two diagnostics engines (SonarQube for IDE and Tailwind CSS
IntelliSense) listed against Open VSX, installed with progress, removed,
switched on and off, their Java requirement, and the
`.lazify/extensions.json` manifest written into a project for agents to
read. The six `extensions` members and `onExtensionInstall`. Linting with
them is ticket 030.

## Goal

The Extensions page shows each engine with its installed version, the
latest on Open VSX, whether an update is there, whether Open VSX could be
reached, and what it needs (SonarLint: Java 21+). Install runs as a job
with `queued` → `downloading` (bytes) → `unpacking` → `done`/`failed`,
which a page opened later can pick up. Remove and toggle answer with the
new list and refresh every manifest already written.

## Status — 2026-10-14

In progress. Everything but downloading and unpacking a package is
ported, and 10 of 10 golden results recorded from Electron match. In the
app: Open VSX listed both engines (668 ms), the Java search found
Temurin 21, a manifest was written. Installing waits on
[request 17](../../chain-sdk-requests/17-install-a-downloaded-package.md)
(sent 2026-10-14): the SonarLint package is 177 MB, which `desktop.http`
would hold in memory with no progress. Until then an install fails with
"Installing extensions isn't available in Lazify Chain yet."

## Source-of-truth references

- Roadmap row: Phase 5 "code quality" (split)
- Old source: `src/main/extensions/*`, `src/main/environment/{java-path,node-path}.ts`,
  `src/main/projects/lazify-directory.ts`, `src/main/ipc/extensions.ts`
- Public API: `extensions.*` (6) and `onExtensionInstall` in
  [`../02-contract-manifest.md`](../02-contract-manifest.md)
- Old tests: none for extensions; a characterisation fixture is added
- Persistent data touched: `<appData>/extensions/installed.json` and
  `<appData>/extensions/<id>/<version>/`; `<project>/.lazify/extensions.json`
  (and `.lazify/` in the project's `.gitignore` inside a repository)
- Required OS behaviour: network to open-vsx.org; `java` 21+ for
  SonarLint; `node` for Tailwind's server

## Target boundary

- Copied to `src/shared/lib/extensions/` (beside the type-only
  stand-ins), file access through `src/platform/folders.ts`, Open VSX
  through `desktop.http`, the Java probe and Node lookup through
  `process-runner`.
- `requirement()` and `launch()` are async (Electron's were synchronous
  over a cached `spawnSync`); their callers already return promises.
- Tailwind's server runs on the user's `node`, as Prettier does (ticket
  024), since there is no bundled Node; Electron ran it on its own with
  `ELECTRON_RUN_AS_NODE`.
- `src/main/projects/lazify-directory.ts` → `src/shared/lib/projects/`,
  shared with API Studio and linting later.
- Download and unpack: request 17.

## Acceptance checklist and evidence

- [x] Golden fixture recorded from Electron (`../scripts/extensions-recorder/`,
      10 snapshots; Open VSX and the Java search faked the same on both
      sides): list (not installed, installed, update available, an error
      status, offline, Java missing), an install refused without Java and
      for an unknown id, toggle (and toggling one not installed), remove,
      the manifest in a repository (`.gitignore` gains `.lazify/` once),
      out of one, for a missing folder, and refreshed after a toggle. The
      Chain copy matches all 10
- [x] In the app: `listExtensions(true)` against the real Open VSX in
      668 ms; `findJavaRuntime(21)` →
      `/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home/bin/java`;
      an install started a job that failed with the not-yet message; a
      manifest written into a scratch project
- [ ] Install of both engines in the app, with progress (request 17)
- [x] `CI=true npm test`, `npm run typecheck`, `npm run build:web` pass

## Differences from Electron

- **Tailwind's server runs on the user's Node**, found on the login-shell
  PATH (`node -p process.execPath`), as Prettier does; Electron used its
  own bundled Node.
- **`beginInstall` is async**: a second click while the first is still
  checking the requirement joins the same start.

## Not removed

Nothing. Nothing in the Electron repo is changed.

## Rollback

Revert the commit; the members go back to their stubs.

## Open questions

None yet.

## Keeping the two copies in step

```sh
npx vitest run --root docs/rewrite/scripts/extensions-recorder
```

Move the snapshot over
`tests/shared/lib/extensions/__snapshots__/extensions.golden.test.ts.snap`,
then check with `CI=true npm test`.

## Verification log

- 2026-10-14, macOS 27.0.1 arm64: fixture recorded from Electron at
  `c9abefc`, copy matches; the app run above on the owner's `chain dev`.
