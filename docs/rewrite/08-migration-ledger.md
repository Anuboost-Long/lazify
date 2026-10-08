# 08 — Migration ledger

Not started. Add one entry per data migration the Chain app performs:
- source store and version,
- destination,
- idempotency proof,
- counts and checksums before and after,
- validation result,
- recovery steps.

Sources are listed in `03-data-inventory.md`. The Chain app reads a **copy**
of the Electron profile and never writes to it (P-3), so the Electron app can
always open it again (D-5).

The import is offered on first launch (D-8):
1. Find the Electron profile and copy it to a timestamped backup.
2. Read the copy and show what was found: projects, tasks, prompts,
   templates, settings and API collections, with counts.
3. Import only after the user confirms. Projects whose folders can't be
   found are listed for the user to fix.
4. Settings keeps an "Import from Lazify" action for running it later.
   Running it again must not duplicate records.

## Entries

| # | Source | Destination | Idempotency | Validation | Recovery |
| --- | --- | --- | --- | --- | --- |
| [010](tickets/010-profile-inspector.md) | Electron profile, read-only | `<appFolder("data")>/electron-import/backups/<time>/` | Each run makes a new timestamped backup | Integrity check and row counts; manifest of every file | Delete the backup folder |
| [011](tickets/011-import-database.md) | `lazify.db` in a backup, schema 1–5 | Chain storage, migrations 1–6 | `INSERT OR IGNORE` by id; ledger in `electron_imports` | Every source id present; `foreign_key_check`; `integrity_check`; orphans counted | Remove the Chain database and import again from the same backup |
