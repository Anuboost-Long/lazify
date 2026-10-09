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
| [003](tickets/003-package-version-matching.md) | **Done.** Package version matching into `src/shared/lib/package-version-matcher/`, registry calls through `src/platform/registry.ts` | 10 golden cases recorded from Electron against a fake registry; identical to Electron on two real projects | **None** in Electron; characterisation fixture added |

## Phase 2 — native platform layer

Each `src/platform/` file offers the shape of one Electron preload group (or
part of one) on top of Chain, so ported screens swap `window.lazify.<group>`
for `@/platform/<group>`. Ordered by the Phase 4 slice: open a project, run
a command, give an agent a task, reload, reconnect.

Exit criterion: contract tests drive the platform layer headlessly; a
terminal and an agent session survive a UI reload and reattach.
**Met on 2026-10-09** (tickets 004 and 008, macOS).

| Ticket | Scope | Status |
| --- | --- | --- |
| [004](tickets/004-terminal-sessions.md) | Terminal sessions: Electron's `PtyRunner` on `desktop.terminal` | **Done.** Survives a real reload |
| [005](tickets/005-scripts.md) | Scripts: list, run, stop, restart, sessions with ports; package manager, .NET, dev-port stepping | **Done.** Two Vite servers side by side in the real app |
| [006](tickets/006-commands.md) | One-shot commands: Electron's `CommandRunner` on `process-runner`, with prompt answering | **Done.** Real git command and a real y/N prompt in the app |
| [007](tickets/007-git.md) | Git: status, changes, diffs and actions; shadow repos for plain folders | **Done.** 30 results match Electron on real repositories |
| [008](tickets/008-agents.md) | Agents: list, launch and resume, attention and turn-done detection, reattach after reload | **Done.** A waiting agent survived a real reload. Notifications wait on request 07 |
| [009](tickets/009-projects.md) | Projects: file tree, file and asset reads, search, pickers over `desktop.folders` | **Done.** Electron's tests and fixture match; search uses one recursive listing |

## Phase 3 — data migration

D-8: on first launch, back up a copy of the Electron profile, show what was
found, import after the user confirms, and list projects that can't be
found. P-3 and D-5: the Electron profile is only ever read.

Exit criterion: a copied real profile opens with the same tasks, prompts,
templates, settings, API collections, and safely recoverable project links.

| Ticket | Scope | Status |
| --- | --- | --- |
| [010](tickets/010-profile-inspector.md) | Find, inspect and back up the Electron profile | **Done in tests.** Real profile waits on a `chain dev` restart |
| [011](tickets/011-import-database.md) | Import the SQLite tables into Chain storage: same schema and ids, one transaction, safe to run twice, orphans skipped | **Done in tests.** Real profile waits on a `chain dev` restart |
| [012](tickets/012-import-files.md) | Import JSON stores and user-owned folders. API Studio secrets held until D-7 | **Done in tests.** Real profile waits on a `chain dev` restart |
| [013](tickets/013-project-list.md) | Project list and `lazify-*` settings from Chromium's LevelDB in the backup (owner chose this over an Electron export) | **Done.** Real profile: 12 projects, 19 settings recovered |
| [014](tickets/014-first-launch-import.md) | First-launch import screen, the import itself, and the project list with access states | **Built.** Waits on the owner's first run after a `chain dev` restart |

## Phase 4 — smallest vertical slice

D-1: port Lazify's renderer as it is. Exit criterion: a user can open a
project, run a command, give an agent a task, reload the app, reconnect,
and understand failures without the old app.

| Ticket | Scope | Status |
| --- | --- | --- |
| [015](tickets/015-renderer-foundation.md) | Whole renderer ported and compiling; `globalThis.lazify` bridge over `src/platform/` | **Done.** All 13 pages render in the app; unported groups say so |
| [016](tickets/016-shell-settings-home.md) | App shell, settings, theme and language persistence, Home | **Done.** Tasks on Chain storage; theme, language, zoom and keep-awake verified in the app |
| [017](tickets/017-open-a-project.md) | Open a project: picker, project list, file tree, preview, search | **Done.** Synced, opened, previewed, searched (300 ms) and removed in the app; the picker with a person pending |
| [018](tickets/018-scripts-pane.md) | Scripts pane and terminal, with reattach after reload | **Done.** A real `vite preview` run survived a reload in the pane and stopped cleanly |
| 019 | Agents page: launch, give a task (Prompt Builder and tasks storage), reattach | Next |

## Chain SDK requests

| # | Request | Unblocks | Status |
| --- | --- | --- | --- |
| 01 | [Project folder access](../chain-sdk-requests/01-project-folder-access.md) | Projects, workspace, env files, templates | Shipped on macOS 2026-10-09; Windows not verified |
| 02 | [File change events](../chain-sdk-requests/02-file-change-events.md) | Live sync, API docs drafts, agent activity | Shipped on macOS 2026-10-09; Windows not verified |
| 03 | [Process working directory and environment](../chain-sdk-requests/03-process-working-directory-and-environment.md) | Git, packages, formatting, scaffolding, DMG | Shipped on macOS 2026-10-09; Windows not verified |
| 04 | [Terminal sessions](../chain-sdk-requests/04-terminal-sessions.md) | Scripts, agents, monitor, Phase 4 exit | Shipped on macOS 2026-10-09; Windows not verified |
| 05 | [Local port availability](../chain-sdk-requests/05-local-port-availability.md) | Dev-port injection, .NET restart wait (ticket 005) | Shipped on macOS 2026-10-09, as `desktop.ports` |
| 06 | [App-owned folders](../chain-sdk-requests/06-app-owned-folders.md) | Shadow repos for agent change review (ticket 007), project staging, pasted images, extensions | Shipped on macOS 2026-10-09, as `desktop.folders.appFolder` |
| 07 | [Attention alerts](../chain-sdk-requests/07-attention-alerts.md) | Agent waiting and turn-done notifications (ticket 008) | Shipped on macOS 2026-10-09, as `desktop.attention`; click path unverified |
| 08 | [Page zoom](../chain-sdk-requests/08-page-zoom.md) | Settings zoom and Cmd +/− (ticket 016) | Shipped on macOS 2026-10-09, as `desktop.pageZoom` |
| 09 | [Keep-awake](../chain-sdk-requests/09-keep-awake.md) | "Keep awake" while agents work (ticket 016) | Shipped on macOS 2026-10-09, as `desktop.keepAwake` |
| later | Data import, transcript reads (see Mneme's request 11), notifications, keep-awake, keychain, ports, LSP stdin, archive unpacking, embedded browser view, updater, menu, zoom | Later slices | Written when the slice is next |
