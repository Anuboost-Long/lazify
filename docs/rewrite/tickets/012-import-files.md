# 012 — Import JSON stores and user folders (Phase 3 / Done in tests, real profile pending)

**Read this whole ticket before touching code.** The Chain app copies the
Electron app's JSON stores and user-owned folders from a ticket 010 backup
into its own data folder, in the same formats.

## Status — 2026-10-09

`src/shared/lib/migration/import-files.ts`: `importElectronFiles(backupFolder)`
reports an outcome per JSON store (`imported`, `kept`, `invalid`, `held`,
`absent`) and counts per folder.

## How it imports

- The Chain app keeps Electron's file names and formats in
  `appFolder("data")`, so a ported feature reads its store as Electron did
  (custom agents already work this way, ticket 008). Importing is a copy.
- A store the Chain app already has is **kept**, and a file already present
  in a folder is not overwritten: the Chain app's own data wins, as in
  ticket 011. Running it twice changes nothing.
- A store that isn't valid JSON is skipped and reported.
- Folders copied: `imported-templates/`, `api-studio-responses/`,
  `api-studio-collection-bodies/`, `api-studio-downloads/`.
- **Held:** `api-studio-environments.json` holds API Studio secrets in plain
  text. It stays in the backup, unimported, until D-7 decides where secrets
  go.
- `Local Storage/` stays in the backup for ticket 013.

## Acceptance checklist and evidence

- [x] Tests (`tests/shared/lib/migration/import-files.test.ts`): valid
      stores and folders copied, invalid JSON skipped, secrets held,
      `Local Storage` not copied; imported custom agents read back by the
      ported agents code; a Chain-side store kept and a second run adding
      nothing
- [x] `CI=true npm test` passes (251 tests); typecheck passes
- [ ] On the real profile (waits on `chain dev` restarting)
