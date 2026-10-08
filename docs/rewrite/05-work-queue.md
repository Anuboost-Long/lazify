# 05 — Work queue

Ordered smallest-safe-first. Each item becomes a ticket in `tickets/` (format:
`tickets/README.md`) before any code changes.

## Sprint A — safeguards (done)

- [x] Dossier skeleton, with the Electron baseline and its pre-existing test failure recorded
- [x] First-pass `01` capability map, `02` contract manifest (generated) and
      `03` data inventory
- [x] Chain SDK requests 01–04 drafted in `../chain-sdk-requests/`
- [x] The owner's in-progress Electron work committed separately (PR #12 in the Electron repo)
- [x] Chain app scaffolded as its own repo, `lazify-chain` (A-3), and
      arranged like Mneme
- [x] Native side verified: `npm run dev` compiled and opened a window that
      reached `desktop.platform.getInfo()` (macOS, arm64, 2026-10-09; first
      checked in the earlier in-repo copy of the scaffold)
- [ ] Owner: approve or amend P-2 and P-3 and answer D-1, D-2 and D-5
      (`04-architecture-decisions.md`)

## Phase 1 — port pure logic (A-4: copy, proven by golden fixtures)

| Ticket | Scope | Why it is safe | Electron tests to mirror |
| --- | --- | --- | --- |
| [001](tickets/001-prompt-assembly.md) | **Done.** Prompt assembly into `src/features/prompts/lib/` | `assemblePrompt` and its helpers import nothing from Node or Electron. The fixture was recorded from the Electron code on 2026-10-09 | `tests/main/prompt-builder.test.ts`, `prompt-presets-and-context.test.ts` |
| 002 | Stack detection (`src/brain/stack-detection`) | The pure parts (`command-builder`, `package-manager-detector`, `detect-stack`) port as-is. Reading the project's files waits on request 01 | `tests/brain/command-builder.test.ts`, `package-json-reader.test.ts` |
| 003 | Package version matching (`semver-utils`, `version-matcher` decisions) | Pure logic. Registry fetches use `desktop.http` through `src/platform` | **None.** Record characterisation fixtures from Electron first |

## Chain SDK requests

| # | Request | Unblocks | Status |
| --- | --- | --- | --- |
| 01 | [Project folder access](../chain-sdk-requests/01-project-folder-access.md) | Projects, workspace, env files, templates | Draft, not sent |
| 02 | [File change events](../chain-sdk-requests/02-file-change-events.md) | Live sync, API docs drafts, agent activity | Draft, not sent |
| 03 | [Process working directory and environment](../chain-sdk-requests/03-process-working-directory-and-environment.md) | Git, packages, formatting, scaffolding, DMG | Draft, not sent |
| 04 | [Terminal sessions](../chain-sdk-requests/04-terminal-sessions.md) | Scripts, agents, monitor, Phase 4 exit | Draft, not sent |
| later | Data import, transcript reads (see Mneme's request 11), notifications, keep-awake, keychain, ports, LSP stdin, archive unpacking, embedded browser view, updater, menu, zoom | Later slices | Written when the slice is next |
