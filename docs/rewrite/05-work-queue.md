# 05 — Work queue

Ordered smallest-safe-first. Each item becomes a ticket in `tickets/` (format:
`tickets/README.md`) before any code changes.

## Sprint A — safeguards (this change set, docs only)

- [x] `docs/rewrite/` skeleton
- [x] `00-baseline.md`, with the pre-existing test failure recorded
- [x] First-pass `01` capability map, `02` contract manifest (generated) and
      `03` data inventory
- [x] Chain SDK requests 01–04 drafted in `../chain-sdk-requests/`
- [x] In-progress worktree changes committed separately (`0cc479c` on
      `feat/agent-monitor-rail-modals`)
- [x] Chain app scaffolded at `apps/lazify` with `chain init` (A-3)
- [ ] Owner: merge `feat/agent-monitor-rail-modals`, tag the baseline, and
      create `rewrite/integration` (`00-baseline.md`, P-2)
- [ ] Verify the native side builds and launches: `npm run dev` in `apps/lazify`
- [ ] Owner: approve or amend P-2 and P-3 and answer D-1, D-2 and D-5
      (`04-architecture-decisions.md`)

## Phase 1 — extraction tickets (proposed, not started)

| Ticket | Scope | Why it is safe | Existing tests |
| --- | --- | --- | --- |
| [001](tickets/001-prompt-assembly-core.md) | Move prompt assembly into `packages/core/prompts` | `assemblePrompt` and its helpers import nothing from Node or Electron. The database stays behind `prompt-builder.ts` | `tests/main/prompt-builder.test.ts`, `prompt-presets-and-context.test.ts` |
| 002 | Stack detection (`src/brain/stack-detection`) behind a read-only filesystem port | Read-only. It introduces the first port and a Node adapter. The pure parts (`command-builder`, `package-manager-detector`, `detect-stack`) move unchanged | `tests/brain/command-builder.test.ts`, `package-json-reader.test.ts` |
| 003 | Package version matching (`semver-utils`, `version-matcher` decisions) | Pure logic. Project reads go through the port from 002, and registry fetches through an HTTP port | **None.** Characterisation tests come first |

## Chain SDK requests

| # | Request | Unblocks | Status |
| --- | --- | --- | --- |
| 01 | [Project folder access](../chain-sdk-requests/01-project-folder-access.md) | Projects, workspace, env files, templates | Draft, not sent |
| 02 | [File change events](../chain-sdk-requests/02-file-change-events.md) | Live sync, API docs drafts, agent activity | Draft, not sent |
| 03 | [Process working directory and environment](../chain-sdk-requests/03-process-working-directory-and-environment.md) | Git, packages, formatting, scaffolding, DMG | Draft, not sent |
| 04 | [Terminal sessions](../chain-sdk-requests/04-terminal-sessions.md) | Scripts, agents, monitor, Phase 4 exit | Draft, not sent |
| later | Data import, transcript reads (see Mneme's request 11), notifications, keep-awake, keychain, ports, LSP stdin, archive unpacking, embedded browser view, updater, menu, zoom | Later slices | Written when the slice is next |
