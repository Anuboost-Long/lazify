# 010 — Electron profile inspector and backup (Phase 3 / Done in tests, real profile pending)

**Read this whole ticket before touching code.** The Chain app can find the
Electron app's profile, report what's in it, and copy what will be imported
into a timestamped backup in its own data folder, without changing the
Electron profile.

## Goal

The first step of D-8 ("import offered on first launch"): before anything is
imported, back up a copy, and show the user what was found. P-3 and D-5: the
Chain app never writes to the Electron profile, so the Electron app can
always open it again.

## Status — 2026-10-09

- `src/shared/lib/migration/electron-profile.ts`:
  - `inspectElectronProfile()` reports the database (schema version,
    integrity check, rows per table, missing tables, read errors), each
    known JSON store (present, valid, record count), each kept folder
    (files, bytes), and warnings in plain language.
  - `backupElectronProfile()` writes
    `<appFolder("data")>/electron-import/backups/<UTC time>/` with the
    database, the JSON stores, the kept folders and a `manifest.json` (file
    list with sizes, and the inspection report).
- `package.json` declares `~/Library/Application Support/lazify` as a
  read-only folder (request 01's declared folders), so Chain itself refuses
  any write there.
- `src/shared/lib/db/schema.ts`: Electron's five migration steps, copied
  verbatim, for ticket 011 and the test fixtures.

## Reading the database

The database is read with macOS's `/usr/bin/sqlite3` through
`process-runner`, like Git: no Chain capability is needed. Electron keeps
`lazify.db` in WAL mode, which decides how it can be opened without writing
beside it:

| State of the profile | How it's read |
| --- | --- |
| `-shm` present: Electron running, or crashed | Read-only; SQLite reads the WAL's pending frames |
| No `-wal`, no `-shm`: Electron closed cleanly | Read-only and immutable; nothing is pending |
| `-wal` without `-shm` | The database and WAL are copied to `appFolder("temp")` and read there, so no frames are lost |

The backup uses SQLite's `.backup` (the backup API), never a raw copy, so it
is consistent even while Electron is writing. It is then switched to a
normal journal, so it's a single self-contained file.

## What is copied

- `lazify.db`.
- The JSON stores listed in `03-data-inventory.md` §2, when present.
- Folders the user owns: `imported-templates/`, `api-studio-responses/`,
  `api-studio-collection-bodies/`, `api-studio-downloads/`, and the raw
  `Local Storage/` folder, which holds the project list (ticket 013).
- Not copied: caches and anything rebuildable (Chromium's `Cache/` and
  friends, `extensions/`, `highlighting/`, `catalog-cache/`,
  `shadow-repos/`, `agent-usage-cache.json`, logs).

## Acceptance checklist and evidence

- [x] Tests on fixture profiles built from Electron's own schema with the
      real `sqlite3` (`tests/shared/lib/migration/electron-profile.test.ts`):
      missing profile; a full profile's counts, stores, folders and
      warnings; a newer schema and a missing table; an unreadable database;
      the backup's contents with caches excluded; rows still in the WAL
      while another connection holds the database; a cleanly closed WAL
      database; a WAL left without its `-shm` after a crash; the Electron
      profile unchanged (sizes and modification times) after inspecting and
      backing up
- [x] `CI=true npm test` passes (241 tests); typecheck passes
- [ ] On the real profile in the running app (waits on `chain dev`
      restarting to pick up the declared read-only folder)

## Real profile at the time of writing (read with `sqlite3` from a shell)

`~/Library/Application Support/lazify`: schema 5; 11 prompt presets, 11
context entries, 3 diagnostic runs, no tasks; `agent-autopilot.json`,
`agent-usage-cache.json`, three API Studio stores, `window-zoom.json`,
`lazy-shield.json`; folders `imported-templates/`, `api-studio-responses/`.
