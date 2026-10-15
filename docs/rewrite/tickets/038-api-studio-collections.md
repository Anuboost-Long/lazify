# 038 — API Studio: collections (Phase 6 / Done)

**Read this whole ticket before touching code.** Fifth of the eight
API Studio slices: save what a user typed for a route — body,
fields, scripts, the response (or an example kept on purpose) — and
let them choose whether it lives in the project or on this machine.
`readApiRequests`, `saveApiRequest`, `forgetApiRequest`,
`setApiRequestStorage`, `readApiResponseBody` of the 23 `api-studio`
members (the last one deferred from ticket 036, since it's backed by
this file, not the send path's own cache).

## Goal

Type a request body, run it, and have it still there next time the
route opens — in the project if the team should see it, on this
machine if not — with the response body itself living in a file
beside the index, not inline in JSON, same as ticket 034's route
cache.

## Status — 2026-10-15

Done, verified live. The five members above are real; 8 `api-studio`
members still reject (`exportPostmanCollection`, `readApiCollections`,
`exportCustomCollection`, `saveResponseFile`, `openResponseFile`,
`readApiCollectionBody`, `saveApiCollections` — "response
files/exports", the next slice — plus the whole `apiDocs` group,
"docs", the last one).

`CI=true npm test`: 853 of 862 pass, 9 skipped (up from 832 — 21 new
cases, `request-store.test.ts` ported essentially unchanged). `npm
run typecheck` and `npm run build:web` pass.

Nothing here needed a new design decision — `request-store.ts` writes
to the same two places ticket 034's `route-cache.ts` and ticket 035's
`environment-store.ts` already established (`appFolder("data")` for
the app-wide store, `.lazify/api-studio/` for the project one), and
`response-bodies.ts` is the same per-file-body pattern `route-cache.ts`
used for route details. The one new piece, `projectKey` (a short id
for a project's own response-body folder under the app's data
folder), reuses `route-identity.ts`'s FNV-1a `stableDigest`, now
pulled into its own `src/shared/lib/hash.ts` since this is the second
caller.

Verified live in `chain dev` through `chain inspect`, against a real
scratch project (`appFolder("data")`, no native picker needed):

- `saveApiRequest` with a response: index came back with the body
  detached to its own file (`bodyFile` set, `body: ""`).
- `readApiResponseBody` on that file: read back the real body.
- `setApiRequestStorage("project")`: the project's own
  `.lazify/api-studio/requests.json` appeared on disk with the saved
  request.
- `forgetApiRequest`: the route disappeared, no error.
- The app-wide store file (`api-studio-requests.json`) was
  `-rw-------` (0600), via the same `restrictToOwner` tickets 035/036
  already use.

## Source-of-truth references

- Roadmap row: Phase 6, fifth row of the API Studio breakdown in
  `../05-work-queue.md`
- Old source (unchanged): `src/main/api-studio/request-store.ts` (339
  lines), `src/main/api-studio/response-bodies.ts` (73 lines)
- Old tests ported: `tests/main/api-studio/request-store.test.ts` (476
  lines, 21 cases)
- Public API (group in `02-contract-manifest.md`): `readApiRequests`,
  `saveApiRequest`, `forgetApiRequest`, `setApiRequestStorage`,
  `readApiResponseBody` only, of the 23-member `api-studio` group
- Persistent data touched: `<appFolder("data")>/api-studio-requests.json`
  (the app-wide index, `0600`), `<project>/.lazify/api-studio/requests.json`
  (the project-local index, no project data is secret so no `0600`),
  `<appFolder("data")>/api-studio-responses/<projectKey>/` or
  `<project>/.lazify/api-studio/responses/` (response/example bodies,
  one file each)

## What changed in the copy, and why

Same treatment as every other project-local/app-wide JSON store this
phase: `node:fs`/`app.getPath` → `@/platform/folders`/`appDataPath()`,
every function async. `createHash("sha1")` for `projectKey` and
`bodyFileName` → `stableDigest` (ticket 034's FNV-1a digest,
extracted to `src/shared/lib/hash.ts` since `request-store.ts` is the
second caller — unifying rather than writing a third copy, per the
project's own "unify near-duplicates" standard). The `0o600` mode on
the app-wide store → `restrictToOwner` (tickets 035/036's shared
helper).

## Target boundary

- `src/shared/lib/hash.ts` (new): `stableDigest`, moved out of
  `route-identity.ts` (unchanged behaviour, same function, new home).
- `src/shared/lib/api-studio/response-bodies.ts`, `request-store.ts`
  (new): ported onto `@/platform/folders`/`@/platform/exec`.
- `src/platform/api-studio.ts`, `lazify.ts`: the five members move
  off `rejects(unported.apiStudio)`.

## Confirmed real API reference

Nothing new — every `@/platform/folders`/`@/platform/exec` function
this file needed was already in place from earlier tickets.

## Execution steps (small commits)

1. Extracted `stableDigest` into `src/shared/lib/hash.ts`, updated
   `route-identity.ts` to import it.
2. `response-bodies.ts`, ported.
3. `request-store.ts`, ported.
4. Platform wiring, fixing `tests/platform/lazify.test.ts`'s example
   member where it collided (same pattern as every prior ticket).
5. Test port (mechanical sync→async conversion, `await` added
   throughout — the two places a chained property access needed
   parens around the `await` were caught by the compiler rejecting
   `.requests` on a `Promise`, not by inspection).
6. Live verification.

## Acceptance checklist and evidence

- [x] `request-store.test.ts` ports and passes, 21 of 21 cases
- [x] A real save-with-response, a real response-body read, a real
      storage-location switch, and a real forget, all through the
      live app
- [x] The app-wide store file confirmed `0600` in the real app
- [x] `CI=true npm test` (853 of 862, whole repo), `npm run
      typecheck`, `npm run build:web` all pass

## Not removed

Nothing. Nothing in the Electron repo is changed. The other 8
`api-studio` members and the whole `apiDocs` group stay rejecting.

## Rollback

Revert the commits; the five members go back to
`rejects(unported.apiStudio)`.

## Open questions

- `collectEveryProject`/`collectExpiredResponses` (sweeping a
  response nobody saved after 5 minutes) ported and is
  characterised in the test suite, but nothing in the app calls it
  yet — Electron presumably runs it on a timer from `main.ts`. Not
  wired to anything in this ticket; worth a one-line check in
  whichever ticket adds the Request/Response screens, since without
  a caller it simply never runs (not a regression on its own — an
  unswept response just stays on disk longer than Electron would
  have kept it, nothing breaks).
- Same as every prior ticket this phase: not yet clicked through the
  actual screen, only driven through the bridge directly.

## Verification log

- 2026-10-15, macOS 27.0.1 arm64: 21 cases pass. Whole-repo `CI=true
  npm test`: 853 of 862, 9 skipped. `npm run typecheck` and `npm run
  build:web`: clean.
- 2026-10-15, macOS 27.0.1 arm64, real app (`chain dev` + `chain
  inspect`): a real `saveApiRequest` with a response detached its
  body to a file; `readApiResponseBody` read it back correctly;
  `setApiRequestStorage("project")` produced a real
  `.lazify/api-studio/requests.json`; `forgetApiRequest` removed the
  route; the app-wide store file confirmed `-rw-------`. Scratch
  folders and the `chain dev` process cleaned up afterward.
