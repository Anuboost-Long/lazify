# 039 — API Studio: response files and exports (Phase 6 / Done)

**Read this whole ticket before touching code.** Sixth of the eight
API Studio slices, and the last one in the 23-member `api-studio`
group itself — only the separate `apiDocs` group ("docs") is left
after this. Custom collections a user builds by hand (not discovered
by scanning), exporting any collection as a Postman v2.1 file, and
saving/opening a response body as a real file. `readApiCollections`,
`saveApiCollections`, `readApiCollectionBody`, `exportPostmanCollection`,
`exportCustomCollection`, `saveResponseFile`, `openResponseFile`.

## Goal

Build a collection of requests by hand (not just what scanning
found), export any collection — scanned or hand-built — as a file
Postman can open, and save or open a response body as a real file on
disk.

## Status — 2026-10-15

Done, verified live. All seven members above are real — every
`api-studio` member now is; only the `apiDocs` group is left
rejecting.

`CI=true npm test`: 881 of 890 pass, 9 skipped (up from 853 — 28 new
cases: `custom-collections.test.ts` (10), `export-custom-collection.test.ts`
(4), `postman-export.test.ts` (9), `response-file.test.ts` (5, missed
by ticket 036 the same way other suites were missed by earlier
tickets — `response-file.ts` itself was ported then, its test wasn't).
`npm run typecheck` and `npm run build:web` pass.

No new design problem — `custom-collections.ts` is the same
app-wide-JSON-plus-detached-bodies shape ticket 038's
`request-store.ts` already used, and `postman-collection.ts` is pure
(builds a plain JSON object, no platform code at all). The one real
decision was `exportPostmanCollection`/`exportCustomCollection`'s
bridge signature: Electron's **renderer** only passes `projectPath`
(and, for the custom case, a `collectionName` used purely to suggest a
filename) — the native save-as dialog and its chosen path are entirely
inside Electron's own IPC handler, never crossing into the exported
function's own parameters the same way `projectPath`/`filePath` do for
everything else this phase. Chain's `folders.pick()` has no save-as
dialog (same gap ticket 033's DMG destination and this ticket's
`saveResponseFile` both already hit) — so the platform wrapper now
picks a destination **folder** and joins the suggested filename
itself, the same workaround, unified into one `exportPathFor()` helper
all three callers (`exportPostmanCollection`, `exportCustomCollection`,
`saveResponseFile`) share.

Verified live in `chain dev` through `chain inspect` (a scratch
project under `appFolder("data")`, no native picker needed for the
collection/body calls — the ones that do need a picker,
`exportPostmanCollection`/`exportCustomCollection`/`saveResponseFile`,
are left for a person, same as every picker-dependent gap this phase):

- `saveApiCollections` with a folder-less collection holding one
  request and one example: read back correctly, the example's body
  detached to its own file.
- `readApiCollectionBody` on that file: read back the real body.
- `openResponseFile` on a real file: opened (exit code 0, `null`
  returned). On a missing file: a clear failure string, not a crash
  or a silent no-op.

## Source-of-truth references

- Roadmap row: Phase 6, sixth row of the API Studio breakdown in
  `../05-work-queue.md`
- Old source (unchanged), `src/main/api-studio/`:
  - `custom-collections.ts` (208 lines — only its types had been
    ported, by ticket 015)
  - `export/postman-collection.ts` (194), `export/write-collection.ts`
    (61 — only its `CollectionExport` type had been ported),
    `export/write-custom-collection.ts` (71)
  - `runner/response-file.ts` — ported by ticket 036; its test was
    missed then, picked up here
  - IPC-layer save dialogs for `saveResponseFile`/
    `exportPostmanCollection`/`exportCustomCollection`
    (`src/main/ipc/api-studio.ts`), moved into the platform wrapper
    since Chain has no save-as dialog to put them behind
- Old tests ported: `tests/main/api-studio/{custom-collections,
  export-custom-collection,postman-export,response-file}.test.ts`
- Public API (group in `02-contract-manifest.md`): `readApiCollections`,
  `saveApiCollections`, `readApiCollectionBody`, `exportPostmanCollection`,
  `exportCustomCollection`, `saveResponseFile`, `openResponseFile` — the
  last seven `api-studio` members
- Persistent data touched: `<appFolder("data")>/api-studio-collections.json`
  (`0600`, same as every other app-wide store this phase),
  `<appFolder("data")>/api-studio-collection-bodies/<projectKey>/`
  (example bodies, one file each)
- Required OS behaviour: `open <path>` for `openResponseFile` (macOS;
  same `process-runner` shelling-out pattern `src/platform/system.ts`
  already uses for `revealInFileManager`/`openTerminal`)

## What changed in the copy, and why

- **`custom-collections.ts`**: same treatment as every app-wide store
  this phase (`app.getPath`/`fs.*`/`createHash` → `appDataPath()`/
  `@/platform/folders`/`stableDigest`, `restrictToOwner` for the
  `0600` mode).
- **`postman-collection.ts`**: ported byte-for-byte — pure, builds a
  plain object, nothing to adapt.
- **`write-collection.ts`/`write-custom-collection.ts`**: `fs.writeFile`
  → `writeTextFile`.
- **The save-as dialog**: Electron's IPC handler shows
  `dialog.showSaveDialog` with a suggested filename and a `.json`
  filter, then calls the export function with the chosen path.
  `exportPathFor()` (new, in `src/platform/api-studio.ts`) picks a
  destination folder instead and joins the suggested name — no
  extension filter either, same gap ticket 033 already decided isn't
  worth a chain-sdk request on its own.
- **`openResponseFile`**: `shell.openPath` → `execFile("open", [path])`.
  The failure message is now whatever `process-runner` reports
  (`"open exited with code 1"`) rather than the OS's own stderr text
  (`"The file … does not exist."`) — still unambiguous that it
  failed, just less descriptive. Noted, not fixed (see Open
  questions).

## Target boundary

- `src/shared/lib/api-studio/custom-collections.ts`,
  `export/postman-collection.ts`, `export/write-collection.ts`,
  `export/write-custom-collection.ts` (ported/completed).
- `src/platform/api-studio.ts`: `exportPathFor()` (new, shared by
  three members), the seven members above.
- `src/platform/lazify.ts`: the seven members move off
  `rejects(unported.apiStudio)` — the last `api-studio` members to do
  so.

## Confirmed real API reference

No new chain-sdk capability. `desktop.folders.pick({ files: false })`
(already used by ticket 033's `dmg.ts` and this ticket's
`saveResponseFile`) is the only "native picker" surface touched, and
it isn't exercised live here (see Open questions) — only the
non-picker members are.

## Execution steps (small commits)

1. `postman-collection.ts`, ported (pure, no dependency on anything
   else new).
2. `custom-collections.ts`, `write-collection.ts`,
   `write-custom-collection.ts`.
3. Platform wiring: `exportPathFor()` extracted once
   `exportPostmanCollection`'s real bridge signature (one argument,
   not two) surfaced a type error against the first draft —
   `saveResponseFile`'s existing pick-and-join logic folded into the
   same helper rather than kept as a second copy.
4. Test port: `custom-collections.test.ts`, `export-custom-collection.test.ts`,
   `postman-export.test.ts` (mechanical sync→async conversion where
   needed), plus `response-file.test.ts` (missed by ticket 036).
5. Live verification.

## Acceptance checklist and evidence

- [x] `custom-collections.test.ts` (10), `export-custom-collection.test.ts`
      (4), `postman-export.test.ts` (9), `response-file.test.ts` (5)
      port and pass
- [x] A real `saveApiCollections`/`readApiCollections`/
      `readApiCollectionBody` round trip, in the real app: a
      hand-built collection's example body detached and read back
      correctly
- [x] A real `openResponseFile` on an existing file and a missing
      one, in the real app: success and a clear failure respectively
- [x] `CI=true npm test` (881 of 890, whole repo), `npm run
      typecheck`, `npm run build:web` all pass

## Not removed

Nothing. Nothing in the Electron repo is changed. The whole `apiDocs`
group stays rejecting — the only `api-studio`-family members left.

## Rollback

Revert the commits; the seven members go back to
`rejects(unported.apiStudio)`.

## Open questions

- `exportPostmanCollection`, `exportCustomCollection` and
  `saveResponseFile` all need the native folder picker
  (`desktop.folders.pick`), which the dev inspector can't drive
  headlessly (same limitation ticket 033 already hit for the DMG
  destination picker). Not yet seen live — left for a person,
  tracked the same way as every other picker-dependent gap this
  phase.
- `openResponseFile`'s failure message is `process-runner`'s own
  wording, not the OS's. Fine for signalling failure; worth
  revisiting only if a future ticket wants to show the person the
  actual OS reason (e.g. "no app is set to open this file type" vs.
  "the file is gone") rather than just that something failed.
- Same as every ticket this phase: not yet clicked through the
  actual Collections/Export screens.

## Verification log

- 2026-10-15, macOS 27.0.1 arm64: 28 new cases pass. Whole-repo
  `CI=true npm test`: 881 of 890 pass, 9 skipped. `npm run
  typecheck` and `npm run build:web`: clean.
- 2026-10-15, macOS 27.0.1 arm64, real app (`chain dev` + `chain
  inspect`): a real hand-built collection saved and read back
  correctly with its example body detached to a file and read back;
  `openResponseFile` succeeded on a real file and failed clearly on a
  missing one. Scratch files and the `chain dev` process cleaned up
  afterward. Not yet done: the native-picker-dependent members, and
  the actual screens clicked through.
