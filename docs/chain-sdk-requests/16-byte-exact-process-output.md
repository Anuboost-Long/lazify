# Capability Request 16 — Process output that keeps every byte

Source: the Lazify rewrite to Chain, ticket 030 (linting through
language servers), 2026-10-14.

**Not part of this request:**
- Starting language servers, or anything LSP-specific. Lazify speaks the
  protocol itself; it only needs the pipe to be exact.
- stdin. Writing UTF-8 text with `write()` is already exact.
- Changing what existing callers get by default.

## Why this needs a change in Chain

Lazify keeps two language servers running per project while the app is
open, SonarLint (Java) and the Tailwind CSS server (Node), and asks
them for findings on the files an agent edits. Both speak the Language
Server Protocol over stdio, where every message is framed by a byte
count:

```
Content-Length: 182\r\n\r\n{"jsonrpc":"2.0","method":"textDocument/publishDiagnostics",…}
```

Electron Lazify reads stdout as raw bytes, appends them to a buffer and
cuts each message at exactly `Content-Length` bytes
(`src/main/linting/engines/lsp/rpc.ts`):

```ts
child.stdout?.on("data", (chunk: Buffer) => {
  buffer = Buffer.concat([buffer, chunk]);
  // … read Content-Length from the header, wait until that many bytes arrived …
  const raw = buffer.subarray(start, start + length).toString();
  buffer = buffer.subarray(start + length);
});
```

`process-runner`'s `onOutput` gives `data: string`, decoded from each
native read on its own with `String::from_utf8_lossy`
(`crates/core/src/process_runner.rs`). When a read ends in the middle of
a multi-byte character, both halves become U+FFFD. The text no longer
has the byte length the header announced, so every message after it is
cut in the wrong place and the session is lost for good. Lazify can't
repair this after the fact: the original bytes are gone.

It only takes one non-ASCII character on a read boundary. SonarLint's
messages use typographic quotes (`“…”`), and paths and code in the
findings can hold any characters, so on a busy project this is a
question of when, not if.

## What Lazify needs

Either of these is enough:

- **Raw bytes:** an option on `run()` to receive stdout (and stderr) as
  `Uint8Array` chunks instead of strings; or
- **Whole characters:** text decoding that carries an incomplete
  trailing sequence over to the next read of the same stream instead of
  replacing it, so concatenating the chunks gives exactly
  `decode(all bytes)`.

Raw bytes is the closer match to Electron, and also covers a server
that sends something other than UTF-8.

Everything else about `run()` stays as it is: `keepStdinOpen`,
`write()`, `kill()`, `exited`, cleanup at quit.

## How Lazify will use it

`src/shared/lib/linting/engines/lsp/rpc.ts` (ported from Electron) will
run the server with `keepStdinOpen`, write framed requests with
`write()`, and frame stdout by byte count as above. Until this exists,
ticket 030 waits; tickets 028 and 029 don't depend on it.
