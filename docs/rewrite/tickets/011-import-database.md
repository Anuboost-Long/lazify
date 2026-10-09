# 011 — Import the SQLite tables (Phase 3 / Done in tests, real profile pending)

**Read this whole ticket before touching code.** The Chain app imports the
Electron database (prompt presets, context entries, tasks, agent runs,
status history, diagnostic runs) from a ticket 010 backup into Chain
storage, keeping every id and value.

## Goal

Roadmap Phase 3: "Implement idempotent migration into the new stores.
Preserve IDs and ordering; record migration version and a rollback/recovery
path. Import SQLite data transactionally; run foreign-key and integrity
checks."

## Status — 2026-10-09

- `src/platform/database.ts`: `database()` migrates Chain storage once and
  returns it. Migrations 1–5 are Electron's five schema steps, unchanged
  (`src/shared/lib/db/schema.ts`), so every table and column matches.
  Migration 6 adds `electron_imports`, a ledger of each import (backup
  folder, source schema version, time, counts).
- `src/shared/lib/migration/import-database.ts`:
  `importElectronDatabase(backupFolder)` imports and reports, per table,
  rows in the source, inserted, already present and orphaned, plus ids
  missing afterwards, foreign-key problems and the integrity check.

## How it imports

- **From the backup, never the profile.** A backup from an older Electron
  (schema below 5) is first brought up to date with Electron's own
  remaining steps, as Electron would on its next start. That changes only
  the backup, which belongs to the Chain app. A schema newer than 5 is
  refused before Chain storage is touched.
- **One transaction.** Tables go in foreign-key order. If any row fails,
  nothing is imported and no ledger entry is written.
- **Same ids, same order.** Rows are read in `rowid` order and inserted with
  their own ids, including the numbered `task_status_events`, so new events
  continue after the imported ones.
- **Safe to run twice.** `INSERT OR IGNORE` on the primary key: a second run
  adds nothing, and a row already changed in the Chain app keeps the Chain
  app's version.
- **Orphans.** Agent runs and status events whose task is missing are
  skipped and counted as `orphaned` instead of failing the import, because
  Chain storage enforces foreign keys. A normal Electron profile has none:
  Electron's `node:sqlite` enforces foreign keys by default
  (`enableForeignKeyConstraints`), so its `ON DELETE CASCADE` worked. This
  only guards a database edited outside Lazify. (Corrected 2026-10-09: this
  section first said Electron never enforced them. That was wrong.)

## Recovery

The backup folder is never changed by an import (apart from the schema
upgrade of an old backup), and the Electron profile is never written. To
start again, remove the Chain app's database and run the import from the
same backup.

## Acceptance checklist and evidence

- [x] Tests with a real SQLite on both sides
      (`tests/shared/lib/migration/import-database.test.ts`): every table
      equal to the source row for row; a second run inserts nothing and
      keeps a Chain-side edit; status-event numbering continues; orphaned
      runs and events skipped and counted; a schema 2 database upgraded,
      with context payloads filled in as Electron's step 3 does, and the
      source profile left at schema 2; a newer schema refused with storage
      untouched; a failure part-way rolls everything back
- [x] `CI=true npm test` passes (248 tests); typecheck passes
- [ ] On the real profile in the running app (waits on `chain dev`
      restarting)

## Not removed

Nothing. Nothing in the Electron repo was changed.
