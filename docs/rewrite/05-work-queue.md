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
- [ ] Report to chain-sdk (the port part is now [request 13](../chain-sdk-requests/13-dev-server-port-in-use.md)): on the first `chain dev` run, Tauri restarted and
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
**Met on 2026-10-10** (tickets 015–020, macOS).

| Ticket | Scope | Status |
| --- | --- | --- |
| [015](tickets/015-renderer-foundation.md) | Whole renderer ported and compiling; `globalThis.lazify` bridge over `src/platform/` | **Done.** All 13 pages render in the app; unported groups say so |
| [016](tickets/016-shell-settings-home.md) | App shell, settings, theme and language persistence, Home | **Done.** Tasks on Chain storage; theme, language, zoom and keep-awake verified in the app |
| [017](tickets/017-open-a-project.md) | Open a project: picker, project list, file tree, preview, search | **Done.** Synced, opened, previewed, searched (300 ms) and removed in the app; the picker with a person pending |
| [018](tickets/018-scripts-pane.md) | Scripts pane and terminal, with reattach after reload | **Done.** A real `vite preview` run survived a reload in the pane and stopped cleanly |
| [019](tickets/019-agent-handoff.md) | Agents page: launch, give a task (Prompt Builder and tasks storage), reattach | **Done.** The Phase 4 exit run passed in the app (sync, launch, task sent, reload, reconnect). Autopilot, past sessions and usage match Electron in tests and show in the app; a reattached agent terminal repaints after a reload |
| [020](tickets/020-failures-and-accessibility.md) | Failures you can understand, and accessibility: unported features named, startup window, keyboard reach | **Done.** Chain-only audit passed; unported features name themselves; Electron's window size, minimum, title and background; Tab reaches every control (requests 11 and 12) |

## Phase 5 — project-authoring workflows

Ordered smallest-safe-first: each group's Electron size, then what it
needs from Chain. Exit criterion: all project manipulation flows have
parity fixtures and failure/cancellation paths, not only success demos.

| Ticket | Scope | Electron source | Chain | Status |
| --- | --- | --- | --- | --- |
| 021 | Environment files: list, read, edit, add, delete, create (`env`, 6 members). Also ends ticket 020's F2 | `src/main/projects/env/*` (339 lines) | `folders` (request 01) | **Done.** Electron's tests pass; every edit checked on disk in the app. Left: the panel with a real file, after a person syncs a project |
| 022 | Packages: list, add, remove, install, outdated, audit, search, fix versions (`packages`, 8) | `src/main/ipc/packages.ts`, `project-health.ts`; version matching done in 003 | `process-runner`, `http` | **Done.** 19 of 19 golden from Electron; every member run against the real npm in the app |
| [023](tickets/023-git-screens-and-history.md) | Git screens and project health, checked against Electron (the platform side is ticket 007) | `src/main/projects/project-health.ts` | — | **Done.** Electron's two unported tests pass; every Git action, the discard confirmation, Home's Git summary and task history checked in the app. Left: tree change marks and the agent diff modal in the app |
| [024](tickets/024-formatting.md) | Formatting (`formatting`, 7) | `src/main/formatting/*` (619 lines) | `process-runner` | **Done.** 29 of 29 golden from Electron; Prettier runs under the user's Node (owner's choice); checked in the app. Left: the Agents page's Format button with a real session |
| [025](tickets/025-project-creation.md) | Starter catalog and project creation, with progress, cancel and failure recovery (`workflow`, `templates` list) | `src/main/scaffolding/*` (2,894 lines, shared with 026) | `folders`, `process-runner`, `http`; request 14 | **Done.** 21 of 21 golden from Electron; Electron's 25 tests pass; a real Next.js starter and Vite project created in the app. Electron has no cancel. Left: the Init screens clicked through |
| [026](tickets/026-imported-templates.md) | Imported templates: analysis, editor, provisioning, tree safeguards, and creating a project from one | `src/brain/template-engine/*`, `imported-template-store.ts`, `tree-reconciler.ts`, `workflow/prepare.ts` (`createProjectFromImportedTemplate`) | `folders` | **Done.** 17 of 17 golden from Electron; Electron's reconciler tests pass; save, edit, create and delete run on a real repo in the app. Left: the Templates screens clicked through |
| [027](tickets/027-developer-environment.md) | Developer environment: tool scan, installs, NVM, listening ports and stop, open in editor (`environment`, 13; `detectEditors`, `openInEditor`) | `src/main/environment/*` (2,834 lines) | `process-runner`, `ports`; request 15 | **Done.** Electron's 34 tests pass; every member run in the app, including `nvmUse` and Stop. Left: an editor seen surviving a quit |
| [028](tickets/028-go-to-definition-and-code-themes.md) | Go to definition and code themes (`findSymbolDefinition`, `listHighlightingAssets`, `openHighlightingFolder`) | `src/main/code-intelligence/*` (945 lines) | `folders`, `process-runner` | **Done.** 2 of 2 golden from Electron; a miss on a real repo in 135 ms. Left: clicked in the editor |
| [029](tickets/029-extensions.md) | Extensions: marketplace install with progress, remove, toggle, the project manifest, the Java runtime (`extensions`, 6) | `src/main/extensions/*` (1,018 lines) | `http`, `folders`, `packages` (request 17) | **Done.** 10 of 10 golden from Electron; listing, Java, the manifest, and installing both engines with progress in the app. Left: the Extensions page clicked through |
| [030](tickets/030-linting.md) | Linting: SonarLint and Tailwind language servers, lint on change, full scans, fix tasks, the agent bridge (`linting`, 6) | `src/main/linting/*` (1,864 lines) | `process-runner` bytes output (request 16), `agent-server` for the bridge | **Done.** 2 of 2 golden from Electron; Electron's six tests pass; both real engines and the agent bridge checked in the app, across a reload. Left: a scan, the editor's underlines and a Claude session in the app |

Prompt Builder and task lifecycle (the roadmap's last Phase 5 bullet)
already run on Chain (tickets 001, 016, 019). Their run and status
history are checked in 023's parity pass rather than a ticket of their own.

## Phase 6 — complex tools

D-3: the embedded browser stays in scope for Chain, decided 2026-10-15.
Its embedding primitive is [chain-sdk request 18](../chain-sdk-requests/18-embedded-browser-view.md),
sent and not yet built; the browser ticket itself waits on it.

| Ticket | Scope | Status |
| --- | --- | --- |
| [031](tickets/031-diagnostics.md) | Diagnostics: the log file, and the fatal-error screen for an error nothing caught (no `linting`/`extensions` preload group — called from `main.ts`/`main.tsx` only) | **Done.** Electron's logger cases pass on the copy; a real uncaught error showed the fatal screen and logged, a real unhandled rejection from an unported feature only logged (a first pass got that backwards and showed the screen for both — fixed and reverified); `getDiagnosticsPaths` answers for real in Settings |
| [032](tickets/032-agents-workbench-monitor.md) | Agents workbench and live monitor mode: confirm the ported Monitor Wall owns each concurrent PTY correctly | **Done.** No code changed — the pool was already the right shape. Two real concurrent sessions checked live: isolated output, correct two-panel rendering, both reattaching after a reload with no gap or duplication, a stop on one leaving the other untouched |
| [033](tickets/033-dmg-compiler.md) | DMG compiler: `ditto`/`hdiutil`/`osascript`/`sips` to turn a built `.app` into a drag-to-install `.dmg` (`dmgBuilder`, 6) | **In progress.** No Chain request needed. 30 characterisation/orchestration tests pass; `inspectAppBundle` and the staging steps (`ditto`, `ln -s`, `hdiutil create`) verified individually against a real app in the dev inspector. Left: mounting onward (`attach`→styling→`detach`→`convert`), which needs the one-time Finder Automation permission and a person at the real app — the inspector couldn't drive it without the session exiting |
| — | Browser: embedded guest view, popup policy, Lazy Shield, media PiP | Waiting on request 18 |
| — | API Studio: route inventory/scanners → route details → environments/secrets (D-7) → request execution → scripts → collections → response files/exports → docs | Not started |

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
| 10 | [Declared read-only files](../chain-sdk-requests/10-declared-read-only-files.md) | Agent usage: Claude's offline cache, the Codex token (ticket 019) | Shipped on macOS 2026-10-09; verified in the app |
| 11 | [Window size and title](../chain-sdk-requests/11-window-size-and-title.md) | Window opens at Electron's 1440×920, minimum 1180×760, titled Lazify (ticket 020) | Shipped on macOS 2026-10-10; verified in the app |
| 12 | [Tab reaches every control](../chain-sdk-requests/12-tab-reaches-every-control.md) | Keyboard navigation parity with Chromium (ticket 020) | Shipped on macOS 2026-10-10; verified in the app |
| 13 | [Dev server port in use](../chain-sdk-requests/13-dev-server-port-in-use.md) | Running lazify-chain and another Chain app (chain-sdk's playground) in development at once | Shipped 2026-10-10 in `chain dev` (no update needed); two windows at once not yet seen |
| 14 | [Copy a folder across volumes](../chain-sdk-requests/14-copy-a-folder.md) | Placing a new project on another drive (ticket 025) | Sent and shipped 2026-10-11: `move()` copies across volumes; needs a `chain dev` restart to rebuild chain-core |
| 15 | [Launch a program that outlives the app](../chain-sdk-requests/15-launch-an-app-that-outlives-lazify.md) | Editors opened from Lazify stay open when it quits (ticket 027) | Sent and shipped 2026-10-14 as `processRunner.launch`; `chain update` run |
| 16 | [Process output that keeps every byte](../chain-sdk-requests/16-byte-exact-process-output.md) | Language servers over stdio (ticket 030) | Sent and shipped 2026-10-14 as `run(…, { output: "bytes" })`; `chain update` run |
| 17 | [Download and unpack a package Lazify can run](../chain-sdk-requests/17-install-a-downloaded-package.md) | Installing SonarLint (177 MB) and Tailwind from Open VSX (ticket 029) | Sent and shipped 2026-10-14 as `desktop.packages`; `chain update` run |
| later | Data import, transcript reads (see Mneme's request 11), notifications, keep-awake, keychain, ports, LSP stdin, archive unpacking, embedded browser view, updater, menu, zoom | Later slices | Written when the slice is next |
