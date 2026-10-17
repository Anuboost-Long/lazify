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
| Launch and recovery | `shared/lib/diagnostics` (logger cases, 2 files); `shared/lib/migration` (import, 5) | — | In the app |
| Navigation/settings | `platform/lazify`; `platform/zoom-keep-awake`; Electron's `app-zoom`, `settings-behavior` (`features/settings`), `pinned-tools` (`app`), `home-desktop`, `desktop-window-frame` (`features/home`), `calendar-grid`, `failure-toast` (`shared/ui`), `fuzzy-match` (`shared/lib`), `init-project-route` (`routes`), ported 2026-10-17 | — (Electron's `main/window-zoom` cases are in `platform/zoom-keep-awake`; its "window that has gone" case doesn't apply: Chain zooms the page) | In the app |
| Projects | `shared/lib/stack-detection` (golden, 4); `shared/lib/projects/importer` (golden); `platform/projects`; Electron's `lazify-directory` (on Node stand-ins for the platform layer, ported 2026-10-17) | — | In the app |
| Workspace files | `shared/lib/projects/{project-asset-reader,project-search}` (Electron's); `platform/fs`; Electron's `workspace-page` (`features/workspace`), `editor-pane-previews`, `project-tree-list`, `tree-context-menu` (`shared/ui/project-tree`), `file-preview-kind`, `code-surface`, `code-find-selection`, `code-selection-menu` (`shared/ui/code`), ported 2026-10-17 | — | In the app |
| Git | `shared/lib/git` (golden, 2); `features/workspace/git-status-visual` (Electron's) | — | In the app |
| Scripts and terminal | `platform` (terminal sessions, scripts); `platform/commands` (golden, 2); Electron's 8, ported 2026-10-17: `shared/lib/terminal-paste`, `shared/terminal/{terminal-file-links,terminal-color-scheme}`, `features/workspace/{terminal-rebind,xterm-panel-hidden-mount,scripts-pane-sessions,sessions-pane}`, `platform/commands/command-runner-prompts` (its real-process case runs on the fake runner in `command-runner`) | — | In the app |
| Agents | `shared/lib/agents` (golden, 4); `features/agents`: Electron's `agents-page-functionality`, `agent-file-modal-previews`, `live-agent-sessions`, `code-send-to-agent`, `tree-send-to-agent`, `diagnostic-to-agent` (ported 2026-10-17); `platform/zoom-keep-awake` (Electron's four keep-awake cases) | — (`main/agents/instance-dirs` doesn't apply: Chain has no process ids, see ticket 007) | In the app |
| Agent monitor | Electron's `agent-monitor-wall-store`, `agent-restart-survives`, `monitor-tidy-up` in `features/agents` (ported 2026-10-17) | — | In the app (ticket 032) |
| Prompt Builder | `features/prompts` (golden, 3); Electron's `prompt-context-grouping`, `prompt-draft-preview`, ported 2026-10-17 | — | In the app |
| Tasks | `shared/lib/tasks` (1) | — | In the app |
| Starter projects | `shared/lib/scaffolding` (golden, 8); Electron's `console-page`, `stack-presentations`, `template-options-panel`, `package-search-picker-utils` (`features/init`), ported 2026-10-17 | — | In the app |
| Imported templates | `shared/lib/scaffolding` (shared with the row above); Electron's `templates-page`, `templates-flow`, `template-tree-editor` (`features/templates`), ported 2026-10-17 | — | In the app |
| Dependencies | `shared/lib/packages`, `shared/lib/package-version-matcher` (golden) | — | In the app |
| Environment files | `shared/lib/projects/env-files` (Electron's); Electron's `env-pane` (`features/workspace`, ported 2026-10-17; one case was already failing in Electron at `c9abefc` and checks the shipped warning instead) | — | In the app |
| Developer environment | `shared/lib/environment` (6); Electron's `java-path`, `node-path`, `ports`, rewritten 2026-10-17 for the async Chain modules (Electron's "never the Electron binary" and Linux `ss` cases have no counterpart) | — | In the app |
| Formatting and code quality | `node/formatter` (golden, 2; Electron's `format-changed-files` cases are in its "no config" scenario: ignore file, named files, a path outside, an unparseable file); `shared/lib/linting` (8); `shared/lib/extensions` (golden); `shared/lib/code-intelligence` (golden); `features/settings/formatter-section` (Electron's); Electron's extension `store`, `project-manifest`, `java-runtime`, `install-jobs`, `sonarlint-provider` rewritten 2026-10-17 for the async Chain modules (`shared/lib/extensions`) | `main/extensions/{sonarlint,tailwind-engine}.e2e` (real engines; they belong with the end-to-end suite, below); `main/extensions/archive` doesn't apply (Chain unpacks natively, request 17); Electron's `code-diagnostics`, `finding-groups`, `findings-panel` ported to `shared/ui/code` 2026-10-17 | In the app |
| Browser and PiP | `features/browser` (Electron's 7); `shared/lib/browser` (golden policy, converter); `shared/lib/media`; `platform/browser-view`, `platform/lazy-shield`; Electron's `lazy-shield-startup` cases in `platform/browser-view` (its "on the session before the engine is built" has no counterpart) | — (`main/browser-swipe-navigation` doesn't apply: Electron's gesture script; Chain's view swipes natively) | In the app |
| API Studio scanning | `shared/lib/api-studio` (characterisation, shared by the three API Studio rows: 27 files) | — | In the app |
| API Studio requests | (above; Electron's `request-scripts` cases were split across `scripting-sandbox`, `run-request` and `run-scripted` in ticket 037); `platform/agents` (Electron's `hidden-runs`: a hidden run stays out of the list) | — (Electron's `suggestions` ported to `features/api-studio` 2026-10-17) | In the app |
| API Studio collections/docs | (above) | — (Electron's 11, with their two harness files, ported to `features/api-studio` 2026-10-17) | In the app |
| DMG compiler | `shared/lib/dmg` (4, characterisation; Electron had none) | — | In the app |
| Updates/diagnostics | `shared/lib/diagnostics`; `platform/updates` (Electron's updater cases, ticket 044) | — (Electron's `crash-handlers`: the portable cases are `shared/lib/diagnostics/global-errors`; signals, native dumps and dialogs don't apply, ticket 031) | In the app (dev build only) |
| Localization/accessibility | Electron's `language-loading` (`i18n`, ported 2026-10-17) | — | In the app (ticket 020) |
| Packaging/platforms | — | — | — |

`tests/architecture/imports` is Electron's `renderer/main-imports` for this
repo's rule: only `src/platform/` calls `@chain/sdk` (type imports aside),
and nothing in `src/` loads Node, Electron or Tauri.

## The gap

On 2026-10-17, 83 of Electron's test files had no counterpart here. Since
then:
- **62 ported** with only their imports changed (a few small adaptations,
  noted in their rows): the updater (ticket 044), then the terminal,
  agent, monitor, workspace, settings, prompt, starter, template, env,
  language, API Studio screen and code-quality screen rows.
- **8 rewritten** for Lazify Chain's async modules on the platform layer,
  keeping Electron's cases: `java-path`, `node-path`, `ports`, and the
  extension `store`, `project-manifest`, `java-runtime`, `install-jobs`,
  `sonarlint-provider`.
- **3 don't apply**: `instance-dirs` (no process ids, ticket 007),
  `keep-awake`'s store (`platform/zoom-keep-awake` covers its four cases),
  `archive` (Chain unpacks natively, request 17).
- **Already covered elsewhere** (found while rewriting): `request-scripts`
  (split across three files in ticket 037), `format-changed-files` (the
  formatter's golden scenarios), `hidden-runs` (`platform/agents`),
  `crash-handlers` (its portable part, ticket 031); and `window-zoom` and
  `lazy-shield-startup`, whose missing cases were added to
  `platform/zoom-keep-awake` and `platform/browser-view`. `main-imports` is
  `tests/architecture/imports`.
- **Doesn't apply either:** `browser-swipe-navigation` (Electron's gesture
  script; Chain swipes natively).
- **Left: 2**, the end-to-end runs of the real SonarLint and Tailwind
  engines (`main/extensions/*.e2e`), which belong with the end-to-end suite
  below.

A row backed only by "In the app" and characterisation can't move to
`Pass` until its Electron tests are ported or ruled out here.

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
