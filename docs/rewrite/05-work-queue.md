# 05 — Work queue

Ordered smallest-safe-first. Each item becomes a ticket in `tickets/` (format:
`tickets/README.md`) before any code changes.

## Sprint A — safeguards (done)

- [x] Dossier skeleton, with the Electron baseline and its pre-existing test failure recorded
- [x] First-pass `01` capability map, `02` contract manifest (generated) and
      `03` data inventory
- [x] Chain SDK requests 01–04 drafted in `../chain-sdk-requests/`, and sent to the
      chain-sdk session on 2026-10-09 in the order 01, 03, 04, 02
- [x] The owner's in-progress Electron work committed separately (PR #12 in the Electron repo)
- [x] Chain app scaffolded as its own repo, `lazify-chain` (A-3), and
      arranged like Mneme
- [x] Native side verified: `npm run dev` in this repo, after the
      restructure, opened a window that reached `desktop.platform.getInfo()`
      (macOS, arm64, 2026-10-09, read through `chain inspect`)
- [ ] Report to chain-sdk: on the first `chain dev` run, Tauri restarted and
      ran `beforeDevCommand` a second time while the first Vite still held
      port 1420. The command exited 1 but left `chain dev`, Vite and two app
      processes running. Separately, `chain init` runs `git init` even
      inside an existing repository
- [x] Owner: approved P-2 (amended) and P-3, and decided D-1, D-2, D-5 and D-8
      (`04-architecture-decisions.md`)

## Phase 1 — port pure logic (A-4: copy, proven by golden fixtures)

| Ticket | Scope | Why it is safe | Electron tests to mirror |
| --- | --- | --- | --- |
| [001](tickets/001-prompt-assembly.md) | **Done.** Prompt assembly into `src/features/prompts/lib/` | `assemblePrompt` and its helpers import nothing from Node or Electron. The fixture was recorded from the Electron code on 2026-10-09 | `tests/main/prompt-builder.test.ts`, `prompt-presets-and-context.test.ts` |
| [002](tickets/002-stack-detection.md) | **Done.** Stack detection into `src/shared/lib/stack-detection/`, reading real folders through `src/platform/folders.ts` | 28 golden cases recorded from Electron; 9 deliberately improved (React stacks were detected as Next.js, see ticket) | `tests/brain/command-builder.test.ts`, `package-json-reader.test.ts` |
| 003 | Package version matching (`semver-utils`, `version-matcher` decisions) | Pure logic. Registry fetches use `desktop.http` through `src/platform` | **None.** Record characterisation fixtures from Electron first |

## Chain SDK requests

| # | Request | Unblocks | Status |
| --- | --- | --- | --- |
| 01 | [Project folder access](../chain-sdk-requests/01-project-folder-access.md) | Projects, workspace, env files, templates | Shipped on macOS 2026-10-09; Windows not verified |
| 02 | [File change events](../chain-sdk-requests/02-file-change-events.md) | Live sync, API docs drafts, agent activity | Shipped on macOS 2026-10-09; Windows not verified |
| 03 | [Process working directory and environment](../chain-sdk-requests/03-process-working-directory-and-environment.md) | Git, packages, formatting, scaffolding, DMG | Shipped on macOS 2026-10-09; Windows not verified |
| 04 | [Terminal sessions](../chain-sdk-requests/04-terminal-sessions.md) | Scripts, agents, monitor, Phase 4 exit | Shipped on macOS 2026-10-09; Windows not verified |
| later | Data import, transcript reads (see Mneme's request 11), notifications, keep-awake, keychain, ports, LSP stdin, archive unpacking, embedded browser view, updater, menu, zoom | Later slices | Written when the slice is next |
