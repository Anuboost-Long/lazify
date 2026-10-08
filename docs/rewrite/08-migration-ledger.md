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
