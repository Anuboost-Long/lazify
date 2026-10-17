# 07 — Test matrix

Which tests stand behind each row of `06-parity-matrix.md`. Counted
2026-10-17: 115 test files and 991 tests in `tests/`, all passing with
`CI=true npm test`. Electron's `tests/` holds 150 test files at the
baseline (`c9abefc`); 67 of them are in this repo under the same name, and
the rest are listed below.

Kinds of evidence, in order of strength:
- **Golden:** a fixture recorded from Electron's code and replayed against
  the copy (A-4). A change means re-recording from Electron.
- **Electron's test:** Electron's own test file, ported with only import
  paths changed.
- **Characterisation:** cases written for this repo that pin the copy's
  behaviour, used where Electron had no test.
- **In the app:** a check run in `chain dev`, recorded in the ticket.

## By parity row

| Parity row | Tests in this repo | Electron tests not ported | macOS |
| --- | --- | --- | --- |
| Launch and recovery | `shared/lib/diagnostics` (logger cases, 2 files); `shared/lib/migration` (import, 5) | `main/crash-handlers` (Electron's signal and native crash handling, ticket 031 says doesn't carry over) | In the app |
| Navigation/settings | `platform/lazify` (unported members name themselves); `platform/zoom-keep-awake` | `app-zoom`, `settings-behavior`, `pinned-tools`, `home-desktop`, `desktop-window-frame`, `calendar-grid`, `failure-toast`, `fuzzy-match`, `init-project-route`, `main/window-zoom` | In the app |
| Projects | `shared/lib/stack-detection` (golden, 4); `shared/lib/projects/importer` (golden); `platform/projects` | `main/projects/lazify-directory` | In the app |
| Workspace files | `shared/lib/projects/{project-asset-reader,project-search}` (Electron's); `platform/fs` | `workspace-page`, `editor-pane-previews`, `file-preview-kind`, `project-tree-list`, `tree-context-menu`, `code-surface`, `code-find-selection`, `code-selection-menu` | In the app |
| Git | `shared/lib/git` (golden, 2); `features/workspace/git-status-visual` (Electron's) | — | In the app |
| Scripts and terminal | `platform` (terminal sessions, scripts); `platform/commands` (golden, 2) | `terminal-paste`, `terminal-rebind`, `terminal-file-links`, `terminal-color-scheme`, `xterm-panel-hidden-mount`, `scripts-pane-sessions`, `sessions-pane`, `main/command-runner-prompts` | In the app |
| Agents | `shared/lib/agents` (golden, 4); `features/agents` (2) | `agents-page-functionality`, `agent-file-modal-previews`, `live-agent-sessions`, `code-send-to-agent`, `tree-send-to-agent`, `diagnostic-to-agent`, `main/agents/instance-dirs`, `main/agents/keep-awake` | In the app |
| Agent monitor | — | `agent-monitor-wall-store`, `agent-restart-survives`, `monitor-tidy-up` | In the app (ticket 032) |
| Prompt Builder | `features/prompts` (golden, 3) | `prompt-context-grouping`, `prompt-draft-preview` | In the app |
| Tasks | `shared/lib/tasks` (1) | — | In the app |
| Starter projects | `shared/lib/scaffolding` (golden, 8) | `console-page`, `stack-presentations`, `template-options-panel`, `package-search-picker-utils` | In the app |
| Imported templates | `shared/lib/scaffolding` (shared with the row above) | `templates-page`, `templates-flow`, `template-tree-editor` | In the app |
| Dependencies | `shared/lib/packages`, `shared/lib/package-version-matcher` (golden) | — | In the app |
| Environment files | `shared/lib/projects/env-files` (Electron's) | `env-pane` | In the app |
| Developer environment | `shared/lib/environment` (6) | `main/environment/node-path`, `java-path`, `ports` | In the app |
| Formatting and code quality | `node/formatter` (golden, 2); `shared/lib/linting` (8); `shared/lib/extensions` (golden); `shared/lib/code-intelligence` (golden); `features/settings/formatter-section` (Electron's) | `main/formatting/format-changed-files`; `main/extensions/{archive,install-jobs,java-runtime,project-manifest,store,sonarlint-provider}`; `main/extensions/{sonarlint,tailwind-engine}.e2e`; `code-diagnostics`, `finding-groups`, `findings-panel` | In the app |
| Browser and PiP | `features/browser` (Electron's 7); `shared/lib/browser` (golden policy, converter); `shared/lib/media`; `platform/browser-view`, `platform/lazy-shield` | `main/lazy-shield-startup` (a different startup here, see ticket 043); `main/browser-swipe-navigation` (Electron's preload gesture; swiping is native in Chain) | In the app |
| API Studio scanning | `shared/lib/api-studio` (characterisation, shared by the three API Studio rows: 27 files) | — | In the app |
| API Studio requests | (above) | `main/api-studio/request-scripts`, `main/api-studio/hidden-runs`, `api-studio/suggestions` | In the app |
| API Studio collections/docs | (above) | `api-studio/{collection,collection-doc,collection-export,collection-memory,collection-order,collection-shape,collection-tree,examples,requests,responses,tabs}` | In the app |
| DMG compiler | `shared/lib/dmg` (4, characterisation; Electron had none) | — | In the app |
| Updates/diagnostics | `shared/lib/diagnostics`; `platform/updates` (Electron's updater cases, ticket 044) | — | In the app (dev build only) |
| Localization/accessibility | — | `language-loading` | In the app (ticket 020) |
| Packaging/platforms | — | — | — |

`renderer/main-imports` checked that Electron's page never imported Node or
Electron. Its Chain equivalent is a rule this repo states but doesn't test:
only `src/platform/` imports `@chain/sdk`.

## The gap

Electron's 83 unported test files (above). Most are renderer tests of
screens that were ported folder for folder (ticket 015), so they should run
with only their imports changed, as `features/browser` did. Several API
Studio, extension and environment rows are covered by this repo's
characterisation or golden cases instead, which test the same logic from
the other side; a port settles which of Electron's cases they miss.

To close it: one ticket that ports them a row at a time, records each one
that can't apply to Chain (and why) here, and adds the `@chain/sdk`
import-boundary test. Until then a row backed only by "In the app" and
characterisation can't move to `Pass`.

## Suites the roadmap asks for (Test strategy)

| Suite | State |
| --- | --- |
| Characterisation | Golden fixtures for every ported main-process area; Electron's tests for most; the gap above |
| Bridge contract | `platform/lazify` checks unported members only. Not started: each member against invalid paths, malformed payloads, cancellation, unsubscribe |
| Data migration | `shared/lib/migration` (import twice, no duplicates; tickets 011–013). The owner's first real import (ticket 014) not yet run |
| End-to-end desktop | Not started. Every check so far is manual in `chain dev`, through `chain inspect` |
| Security | Not started as a suite. Done piecemeal: path checks (folders), API Studio host consent, browser navigation policy and the preview's loopback rule. Update-signature failure waits on request 22 |
| Reliability | Reload with live terminals and agents checked in the app (tickets 004, 019, 032). Not started: crash recovery, cancellation during create/install/scan/update, offline, large projects |

## OS runs

Every row is macOS-only today (D-2). Windows and Linux are `Not tested`.
