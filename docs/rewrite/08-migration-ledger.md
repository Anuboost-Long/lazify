# 08 — Migration ledger

Not started. Add one entry per data migration the Chain app performs:
- source store and version,
- destination,
- idempotency proof,
- counts and checksums before and after,
- validation result,
- recovery steps.

Sources are listed in `03-data-inventory.md`. The Chain app reads a **copy**
of the Electron profile and never writes to it (P-3).
