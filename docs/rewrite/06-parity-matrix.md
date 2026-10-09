# 06 — Old-versus-new parity matrix

The release gate. The rows and rules are the roadmap's "Old-versus-new rebuild
comparison checklist"; read the exact behaviour to compare there. Fill in
**Old evidence** and **New evidence** with links (fixture IDs, test runs,
recordings in `evidence/`).

Results: `Not started` · `Different by design (approved)` · `Pass` · `Blocker`.
An untested OS is `Not tested`, never `Pass`.

| Area | Old evidence | New evidence | macOS | Windows | Linux | Result |
| --- | --- | --- | --- | --- | --- | --- |
| Launch and recovery | | | | | | Not started |
| Navigation/settings | | | | | | Not started |
| Projects | Fixtures recorded at `c9abefc` | Stack detection ([ticket 002](tickets/002-stack-detection.md)) and the file tree, file reads and pickers ([ticket 009](tickets/009-projects.md), Electron's fixture matches). Stack detection: 19 of 28 golden cases match; 9 are Different by design (approved 2026-10-09: React stacks no longer detected as Next.js). Verified on six real projects through `desktop.folders` | Partial | Not tested | Not tested | Not started |
| Workspace files | `tests/main/project-asset-reader.test.ts`, `projects/project-search.test.ts` | [Ticket 009](tickets/009-projects.md): Electron's tests pass on the copy; search and previews verified in the app. Screens not ported | Partial | Not tested | Not tested | Not started |
| Git | Fixture recorded at `c9abefc` on real repositories | [Ticket 007](tickets/007-git.md): 30 of 30 golden results, including shadow repos; verified in the app. Screens not ported | Partial | Not tested | Not tested | Not started |
| Scripts and terminal | `src/main/pty-runner.ts`; environment fixture at `c9abefc` | Sessions ([ticket 004](tickets/004-terminal-sessions.md), survives a real reload) and scripts ([ticket 005](tickets/005-scripts.md), two real Vite servers); the ported Scripts pane runs, reattaches after a reload and stops ([ticket 018](tickets/018-scripts-pane.md)). Port check Different by design (stricter). Agent badges wait on ticket 008 | Partial | Not tested | Not tested | Not started |
| Agents | `tests/main/agents/agent-functionality.test.ts` | [Ticket 008](tickets/008-agents.md): Electron's agent tests pass on the copy; launch, attention and reattach verified in the app. [Ticket 019](tickets/019-agent-handoff.md): autopilot wired and tested; past sessions (5 of 5 golden) and usage (4 of 4 golden) match Electron and show in the app; a reattached agent terminal repaints after a reload | Partial | Not tested | Not tested | Not started |
| Agent monitor | | | | | | Not started |
| Prompt Builder | Fixture recorded at `c9abefc` | Prompt assembly: [ticket 001](tickets/001-prompt-assembly.md), 16 of 16 golden cases. Storage: [ticket 019](tickets/019-agent-handoff.md), Electron's 52 tests pass on Chain storage | Partial | Not tested | Not tested | Not started |
| Tasks | `tests/main/tasks.test.ts` | [Ticket 016](tickets/016-shell-settings-home.md): Electron's tests pass on Chain storage (21 of 21, prompt building in [ticket 019](tickets/019-agent-handoff.md)); shown on Home; a task handed to a real agent in the app | Partial | Not tested | Not tested | Not started |
| Starter projects | | | | | | Not started |
| Imported templates | | | | | | Not started |
| Dependencies | Fixtures recorded at `c9abefc` and on 2026-10-10 | Version matching: [ticket 003](tickets/003-package-version-matching.md), 10 of 10 golden. List, add, remove, install, outdated, audit, search and fix: [ticket 022](tickets/022-packages.md), 19 of 19 golden from Electron; every member run against the real npm in the app | Partial | Not tested | Not tested | Not started |
| Environment files | `tests/main/projects/env-files.test.ts` | [Ticket 021](tickets/021-env-files.md): Electron's 24 tests pass on the copy; every edit verified on disk in the app. Panel with a real file waits on a person at the picker | Partial | Not tested | Not tested | Not started |
| Developer environment | | | | | | Not started |
| Formatting and code quality | | | | | | Not started |
| Browser and PiP | | | | | | Not started |
| API Studio scanning | | | | | | Not started |
| API Studio requests | | | | | | Not started |
| API Studio collections/docs | | | | | | Not started |
| DMG compiler | | | | N/A | N/A | Not started |
| Updates/diagnostics | | | | | | Not started |
| Legal and marketing | | | | | | Not started |
| Localization/accessibility | | | | | | Not started |
| Packaging/platforms | | | | | | Not started |

## Cross-cutting gates

| Gate | Evidence | Result |
| --- | --- | --- |
| Data fidelity | | Not started |
| API/RPC compatibility (every member of `02-contract-manifest.md`) | | Not started |
| Process lifecycle | | Not started |
| Filesystem safety | | Not started |
| Security | | Not started |
| Offline/error handling | | Not started |
| Performance (thresholds still to be approved) | | Not started |
| OS matrix | | Not started |

## Intended differences already known (need approval)

- File reads become limited to granted project roots. Today they are not
  limited (`02-contract-manifest.md`, "Contract hazards").
