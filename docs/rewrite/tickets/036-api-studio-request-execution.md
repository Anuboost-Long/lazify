# 036 — API Studio: request execution (Phase 6 / Done)

**Read this whole ticket before touching code.** Third of the eight
API Studio slices in `05-work-queue.md`: send a built request for real
and get back status, headers, body (or a saved file for a binary
one), with host consent for remote calls. `sendApiRequest`,
`readAllowedHosts`, `allowApiHost`, `forgetApiHost` of the 23
`api-studio` members.

**Not in scope**, deliberately: `runApiRequest` (the scripted
send — pre/post-request scripts, `../scripting`'s sandbox, not built
yet) and `readApiResponseBody` (backed by `request-store.ts`, the
"collections" slice's save/load, not this one's). Both are later
tickets, matching the breakdown's own order: request execution →
scripts → … → collections.

## Goal

Build a request (ticket 034/035 already supply the route, the
variables and the environment values), send it for real, and see what
came back — a 200 with a JSON body, a 404, a connection failure
explained in plain language, or a downloaded file for a response that
isn't text. A host the project hasn't sent to before can be allowed or
forgotten.

## Status — 2026-10-15

Done, verified live. `sendApiRequest`, `readAllowedHosts`,
`allowApiHost`, `forgetApiHost` are real on `src/platform/lazify.ts`;
16 `api-studio` members still reject (`runApiRequest`,
`readApiResponseBody` included, see above).

`CI=true npm test`: 803 of 812 pass, 9 skipped (up from 759 — 44 new
cases across `send-request`, `allowed-hosts`, `loopback-tls` and
`build-request.test.ts`, the last one missed by ticket 034 the same
way `environment.test.ts` was missed by it — another already-ported
pure module, `runner/build-request.ts`, whose own characterisation
suite had never landed). `npm run typecheck` and `npm run build:web`
pass.

The one real design problem this ticket had to solve: Electron sends
requests with Node's `fetch` plus an `undici` dispatcher
(`runner/tls-trust.ts`) that relaxes certificate checking for loopback
hosts only. Neither exists in the webview. `desktop.http` is the
replacement — but it had no TLS-exception option at all when this
ticket started. Filed
[chain-sdk request 19](../chain-sdk-requests/19-loopback-tls-trust.md);
chain-sdk shipped `trustLoopbackCertificates` the same day. Verified
live (below) against a real `openssl`-generated self-signed localhost
certificate, through the real app.

Then verified live in `chain dev` through `chain inspect` (a Node
HTTP server and a Node HTTPS server with a real self-signed cert, both
on loopback, no native picker needed for either):

- A real GET to the self-signed HTTPS server: 200, correct body,
  through `trustLoopbackCertificates`.
- A real POST with a JSON body to the plain HTTP server: body
  correctly received server-side.
- A real binary (PNG) response: no body text, a real file written
  under `appFolder("data")/api-studio-downloads/`, byte-for-byte
  correct (checked with `xxd`).
- A real connection-refused (nothing listening on the port used):
  `{ ok: false, error: "error sending request for url (…)" }` — a
  clean, readable failure, not a crash. (`reqwest`'s own wording, not
  Electron's `ECONNREFUSED` — see Open questions.)
- `allowApiHost`/`readAllowedHosts` against a real scratch project:
  saved and read back correctly, and the store file was `-rw-------`
  (0600), using the `restrictToOwner` helper ticket 035 introduced.

## Source-of-truth references

- Roadmap row: Phase 6, third row of the API Studio breakdown in
  `../05-work-queue.md`
- Old source (unchanged), `src/main/api-studio/`:
  - `runner/send-request.ts` (148), `runner/multipart-body.ts` (77),
    `runner/response-file.ts` (90), `runner/tls-trust.ts` (24, only
    `isLoopbackHost` is portable — see below)
  - `allowed-hosts.ts` (57)
  - Entry point: `runner/index.ts`'s `sendApiRequest`/`runApiRequest`
    exports (only the first is this ticket's)
- Old tests ported: `tests/main/api-studio/{send-request,
  allowed-hosts, loopback-tls, build-request}.test.ts`
- Public API (group in `02-contract-manifest.md`): `sendApiRequest`,
  `readAllowedHosts`, `allowApiHost`, `forgetApiHost` only, of the
  23-member `api-studio` group
- Persistent data touched: `<appFolder("data")>/api-studio-allowed-hosts.json`
  (hosts a project has consented to, keyed by resolved project path —
  same shape as ticket 035's environment secrets file, same `0600`),
  `<appFolder("data")>/api-studio-downloads/` (binary response bodies)
- Required OS behaviour: none beyond what `desktop.http` and
  `restrictToOwner`'s `chmod` already needed

## What changed in the copy, and why

Every file in this slice touches either the network or disk, so
nothing here is pure — all of it calls `src/platform/` directly
(`http.ts`, `folders.ts`, `exec.ts`), the same shape ticket 034's
`route-cache.ts` and ticket 035's `environment-store.ts` used.

- **`src/platform/http.ts` gained `requestBytes`**: a thin wrapper
  that always asks `desktop.http.request()` for `responseType:
  "bytes"`. Electron's `fetch` reader could stop pulling bytes the
  moment it had 2 MB, which is both the display cap and a real memory
  bound; `desktop.http` reads the whole body before Lazify ever sees
  it (its own contract: "No streaming… whole bodies only"), so a
  generous **download** cap (`maxBytes: 100_000_000`, rejecting
  `TOO_LARGE` past it) replaces the memory bound, and the **display**
  truncation (2 MB, `truncated: true`, same as Electron) happens
  afterward in JS against bytes already fully in hand. A response
  between those two numbers behaves exactly like Electron's; one past
  100 MB fails outright instead of showing a truncated preview — a
  real, narrow difference, not expected to matter for a development
  API.
- **`runner/response-file.ts`**: `app.getPath("userData")` →
  `appDataPath()`; `fs.existsSync`/`writeFileSync` → `pathExists`/
  `writeFileBytes`, both async now.
- **`runner/multipart-body.ts`**: Node's `Buffer` doesn't exist in the
  webview — every `Buffer` became a plain `Uint8Array`, with a small
  hand-rolled byte-subsequence search standing in for
  `Buffer.prototype.includes` (boundary-collision check) and a manual
  `concat` standing in for `Buffer.concat`. `fs.stat`/`fs.readFile` →
  `fileStat`/`readFileBytes`.
- **`runner/tls-trust.ts`**: only `isLoopbackHost` ported.
  `apiRequestDispatcher` (the `undici` `Agent`) has no replacement to
  port onto — see Status and chain-sdk request 19. Chain's own
  `trustLoopbackCertificates` now computes loopback-ness itself
  server-side too, so Lazify's check is strictly redundant, but it's
  what decides *whether to pass the flag at all*, so it stays.
- **`allowed-hosts.ts`**: same treatment as ticket 035's
  `environment-store.ts` — `app.getPath`/`fs.*` → `appDataPath()`/
  `@/platform/folders`, and the `0o600` mode Electron set is restored
  by ticket 035's shared `restrictToOwner()` (moved to
  `src/platform/exec.ts` this pass, replacing both tickets' own
  near-duplicate copies with one).

## Target boundary

- `src/shared/lib/api-studio/runner/{send-request,multipart-body,
  response-file,tls-trust}.ts`, `src/shared/lib/api-studio/allowed-hosts.ts`
  (new).
- `src/platform/http.ts`: `requestBytes` added beside the existing
  `getJson`.
- `src/platform/exec.ts`: `restrictToOwner` added (shared with ticket
  035's `environment-store.ts`, which now imports it instead of
  defining its own copy).
- `src/platform/api-studio.ts`, `lazify.ts`: the four members move off
  `rejects(unported.apiStudio)`.

## Confirmed real API reference

- `desktop.http.request({ url, method, headers, data, timeout,
  responseType: "bytes", maxBytes, validateStatus: () => true,
  trustLoopbackCertificates })` — exercised live for GET, POST with a
  JSON body, a binary response, and a connection failure.
- `trustLoopbackCertificates` — chain-sdk request 19, shipped
  2026-10-15, verified live against a real self-signed certificate.

## Execution steps (small commits)

1. Filed chain-sdk request 19 first (TLS trust), since everything
   downstream depends on knowing its shape.
2. `src/platform/exec.ts`'s `restrictToOwner`, extracted from ticket
   035's `environment-store.ts` once this ticket needed the same
   thing for `allowed-hosts.ts` — fixing the near-duplicate rather
   than writing a third copy.
3. `response-file.ts`, `multipart-body.ts`, `tls-trust.ts` (the
   `isLoopbackHost` half) — each portable on its own, each a
   dependency of `send-request.ts`.
4. `src/platform/http.ts`'s `requestBytes`, then `send-request.ts`
   itself, once request 19 confirmed the shape to call it with.
5. `allowed-hosts.ts`.
6. Platform wiring, then live verification against two real local
   servers (plain HTTP, self-signed HTTPS).

## Acceptance checklist and evidence

- [x] `send-request.test.ts`, `allowed-hosts.test.ts`,
      `loopback-tls.test.ts` port and pass unchanged (17 cases)
- [x] `build-request.test.ts` ported (27 cases, missed by ticket 034)
- [x] A real GET and a real POST with a body, against a real local
      HTTP server, in the real app: correct status, headers, body
- [x] A real self-signed HTTPS loopback server, in the real app:
      accepted with `trustLoopbackCertificates`, confirming chain-sdk
      request 19 end-to-end, not just in chain-sdk's own tests
- [x] A real binary response, in the real app: written to a real file
      under `appFolder("data")`, bytes verified exact
- [x] A real connection failure, in the real app: a clean `ok: false`
      outcome, not a crash
- [x] `allowApiHost`/`readAllowedHosts` against a real scratch
      project, in the real app: saved, read back, file mode `0600`
- [x] `CI=true npm test` (803 of 812, whole repo), `npm run
      typecheck`, `npm run build:web` all pass

## Not removed

Nothing. Nothing in the Electron repo is changed. `runApiRequest` and
the other 15 unported `api-studio` members stay rejecting.

## Rollback

Revert the commits; the four members go back to
`rejects(unported.apiStudio)`.

## Open questions

- The connection-refused failure message is now `reqwest`'s own
  wording ("error sending request for url (…)"), not Node's
  `ECONNREFUSED`. Fine for a human reading it, but any code (none
  currently) that pattern-matched Electron's exact wording would need
  updating. Characterisation tests here run against a Node-backed
  fake of `desktop.http` (`tests/platform/node-http.ts`, new this
  ticket, the same role `node-folders.ts` plays for `desktop.folders`)
  and so still assert the old `ECONNREFUSED` wording in that fake —
  intentionally: the fake's job is to exercise the same code paths
  with real sockets, not to reproduce Rust's exact error text.
- A loopback host that redirects to a non-loopback host now rejects
  outright (chain-sdk's `trustLoopbackCertificates` note, recorded in
  request 19) rather than following the redirect the way Electron
  did. Not yet seen in practice; a dev server redirecting its own API
  off-box would be unusual.
- Not yet clicked through the actual Request/Response panel UI (same
  gap as tickets 034 and 035) — verified by driving the bridge
  directly, not through the screen a person would use.

## Verification log

- 2026-10-15, macOS 27.0.1 arm64: 44 characterisation cases pass
  across the four ported suites. Whole-repo `CI=true npm test`: 803 of
  812 pass, 9 skipped. `npm run typecheck` and `npm run build:web`:
  clean.
- 2026-10-15, macOS 27.0.1 arm64, real app (`chain dev` + `chain
  inspect`), against two real local servers (a plain Node `http`
  server and a Node `https` server with a real `openssl`-generated
  self-signed localhost certificate): a GET and a POST against the
  HTTP server both correct; the HTTPS server accepted only with
  `trustLoopbackCertificates`, confirmed with a real 200 and the
  right body; a binary PNG response written to a real file, bytes
  verified with `xxd`; a connection-refused case returned a clean
  failure outcome; `allowApiHost`/`readAllowedHosts` against a real
  scratch project round-tripped correctly with the store file at
  `0600`. Both servers, all scratch files/folders and the `chain dev`
  process cleaned up afterward. Not yet done: the actual screens
  clicked through.
