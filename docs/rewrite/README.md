# Lazify rewrite dossier — Electron to Chain SDK

**Current phase:** Phase 3 (data migration). Phases 1 and 2 are done. The Electron app in
`../lazify` is unchanged and stays that way (A-3). This repo is the Chain
app; see [`../../AGENTS.md`](../../AGENTS.md) for its layout.

Paths such as `src/main/…`, `src/preload/…` and `tests/…` in this dossier
refer to the Electron repo unless they say otherwise.

Read first:
1. [`../framework-neutral-rewrite-roadmap.md`](../framework-neutral-rewrite-roadmap.md):
   the scope, phases and parity gates, plus the agent execution playbook.
   Its hard prohibitions apply to every change.
2. [`04-architecture-decisions.md`](04-architecture-decisions.md): Chain SDK
   is the target. Read what is decided and what is waiting
   on the owner.
3. [`05-work-queue.md`](05-work-queue.md): what is next.

| Doc | Contents | State |
| --- | --- | --- |
| [00-baseline](00-baseline.md) | Electron reference commit, commands, test baseline, OS matrix | Recorded |
| [01-capability-inventory](01-capability-inventory.md) | Each area mapped to its Electron source and the Chain capability it needs | First pass |
| [02-contract-manifest](02-contract-manifest.md) | All 217 preload members, generated from source | First pass (no schemas yet) |
| [03-data-inventory](03-data-inventory.md) | SQLite, app JSON, project `.lazify/`, renderer `localStorage` | First pass (no record schemas yet) |
| [04-architecture-decisions](04-architecture-decisions.md) | Accepted and open decisions | D-3, D-4, D-6, D-7 open (later phases) |
| [05-work-queue](05-work-queue.md) | Extraction tickets and Chain requests, in order | Active |
| [06-parity-matrix](06-parity-matrix.md) | Old-versus-new release gate | All rows `Not started` |
| [07-test-matrix](07-test-matrix.md) | Tests mapped to parity rows | Not started |
| [08-migration-ledger](08-migration-ledger.md) | Each data migration and its validation | Backup and SQLite import |
| [09-rollback-and-recovery](09-rollback-and-recovery.md) | Fallback per slice | Not started |
| [10-release-readiness](10-release-readiness.md) | Signing, updater, cutover | Not started |
| [tickets/](tickets/README.md) | One doc per change set (merged ticket and feature-doc format) | 001–011 done |
| [evidence/](evidence/README.md) | Test output, fixtures, recordings | Empty |

Native features Lazify needs from Chain are requested in
[`../chain-sdk-requests/`](../chain-sdk-requests/README.md), following
Chain's `docs/CAPABILITY_WORKFLOW.md`.
