# 013 — Project list and settings from Electron's localStorage (Phase 3 / Done in tests, real profile checked)

**Read this whole ticket before touching code.** The Chain app recovers the
Electron app's project list and its `lazify-*` settings from the backup copy
of Chromium's `Local Storage`, without any change to the Electron app.

## Decision (owner, 2026-10-09)

Read Chromium's LevelDB from the backup, rather than rebuilding the list from
other data or adding an export step to the Electron app (which A-3 rules
out). `03-data-inventory.md` §4 had called this fragile; the data turned out
to be plain JSON, and the reader is pinned by fixtures from a real Chrome.

## Status — 2026-10-09

- `src/shared/lib/migration/leveldb.ts`: a read-only LevelDB reader. Log
  files (32 KB blocks, records split across blocks, CRC32C checked, a torn
  tail dropped as LevelDB does), write batches (puts and deletions with
  sequence numbers), table files (`.ldb`: footer, index, prefix-compressed
  blocks, Snappy decompression), and the newest sequence per key winning,
  with deletions honoured.
- `src/shared/lib/migration/electron-local-storage.ts`: Chromium's layer.
  Keys are `_<origin>\0<key>`; keys and values start with `\x01` (Latin-1)
  or `\x00` (UTF-16). It picks the origin holding
  `lazify-workspace-projects` (preferring `file://`), keeps `lazify-*`
  items, lists the stored projects (`projectPath`, `projectName`), and
  imports items into the Chain app's own `localStorage`, keeping any it
  already has.
- The ported renderer reads the same keys, so the imported items need no
  conversion.

## Fixtures

`docs/rewrite/scripts/leveldb-fixtures/generate.sh` runs the Chrome
installed on the machine, headless with a throwaway profile, twice. The
first run writes older values and about 7 MB of repetitive bulk data; the
second reopens the database (LevelDB compacts the old log into a
Snappy-compressed table), removes the bulk and one key, and writes the items
in `tests/shared/lib/migration/fixtures/chrome-local-storage/expected.json`.
The committed files are only that synthetic data (264 KB).

## Acceptance checklist and evidence

- [x] Tests (`tests/shared/lib/migration/leveldb.test.ts`): exactly
      `expected.json` read back; the table file is Snappy-compressed and
      holds older values that the newer log overrides (a changed theme and a
      removed key); UTF-16 and Latin-1 values; the project list; a torn log
      tail; a corrupt Snappy stream rejected
- [x] `CI=true npm test` passes (256 tests); typecheck passes
- [x] A scratch copy of the real Electron `Local Storage` (one log and five
      tables), read in Node: origins `file://` and `https://claude.ai`; 19
      `lazify-*` items from `file://`; 12 projects. The copy was deleted.
- [ ] Imported into the Chain app's `localStorage` in the running app
      (ticket 014's flow, after `chain dev` restarts)
