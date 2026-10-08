# Lazify rewrite dossier — Electron to Chain SDK

**Current phase:** Sprint A (safeguards). The Electron app is unchanged. The
new Chain app is the untouched `chain init` scaffold in
[`apps/lazify/`](../../apps/lazify/AGENTS.md).

Read first:
1. [`../framework-neutral-rewrite-roadmap.md`](../framework-neutral-rewrite-roadmap.md):
   the scope, phases and parity gates, plus the agent execution playbook.
   Its hard prohibitions apply to every change.
2. [`04-architecture-decisions.md`](04-architecture-decisions.md): Chain SDK
   is the target. Read what is decided, what is proposed, and what is waiting
   on the owner.
3. [`05-work-queue.md`](05-work-queue.md): what is next.

| Doc | Contents | State |
| --- | --- | --- |
| [00-baseline](00-baseline.md) | Electron reference commit, commands, test baseline, OS matrix | Recorded |
| [01-capability-inventory](01-capability-inventory.md) | Each area mapped to its Electron source and the Chain capability it needs | First pass |
| [02-contract-manifest](02-contract-manifest.md) | All 217 preload members, generated from source | First pass (no schemas yet) |
| [03-data-inventory](03-data-inventory.md) | SQLite, app JSON, project `.lazify/`, renderer `localStorage` | First pass (no record schemas yet) |
| [04-architecture-decisions](04-architecture-decisions.md) | Accepted, proposed and open decisions | Waiting on the owner |
| [05-work-queue](05-work-queue.md) | Extraction tickets and Chain requests, in order | Active |
| [06-parity-matrix](06-parity-matrix.md) | Old-versus-new release gate | All rows `Not started` |
| [07-test-matrix](07-test-matrix.md) | Tests mapped to parity rows | Not started |
| [08-migration-ledger](08-migration-ledger.md) | Each data migration and its validation | Not started |
| [09-rollback-and-recovery](09-rollback-and-recovery.md) | Fallback per slice | Not started |
| [10-release-readiness](10-release-readiness.md) | Signing, updater, cutover | Not started |
| [tickets/](tickets/README.md) | One doc per change set (merged ticket and feature-doc format) | 001 proposed |
| [evidence/](evidence/README.md) | Test output, fixtures, recordings | Empty |

Native features Lazify needs from Chain are requested in
[`../chain-sdk-requests/`](../chain-sdk-requests/README.md), following
Chain's `docs/CAPABILITY_WORKFLOW.md`.
