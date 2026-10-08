# 03 — Data inventory (first pass)

Every place Lazify keeps user data, found by searching live source
(`app.getPath(...)`, `.lazify` path joins, `localStorage` keys) at the
baseline commit. **First pass**: locations are confirmed. Schemas, versions
and record shapes are still to be filled per store before Phase 3.

`<userData>` is `~/Library/Application Support/lazify` on macOS. The Windows
and Linux locations are Electron's defaults and have not been verified.

## 1. SQLite — `<userData>/lazify.db`

Opened by `src/main/db/connection.ts` with `node:sqlite`, in WAL mode.
Migrations live in `src/main/db/migrations.ts`, and the step counter is
`PRAGMA user_version`.

| Table | Owner | Indexes |
| --- | --- | --- |
| `prompt_presets` | `src/main/prompts/preset-store.ts` | — |
| `context_entries` (+ `payload` column added by a later step) | `src/main/prompts/context-store.ts`, `builtin-context.ts` | `context_entries_scope (scope, scope_key)` |
| `tasks` | `src/main/tasks/task-store.ts` | `tasks_project (project_path, status)` |
| `task_agent_runs` | `src/main/tasks/run-store.ts` | `task_agent_runs_task (task_id, started_at DESC)` |
| `task_status_events` | `src/main/tasks/status-events.ts` | `task_status_events_task (task_id, id)` |
| `diagnostic_runs` | No reader or writer under `src/` at baseline; only the migration (added in `72dc09d`) creates it | `diagnostic_runs_project (project_path, started_at DESC)` |

Migration notes:
- Copy from a consistent snapshot (`VACUUM INTO` or the SQLite backup API),
  never a raw copy while WAL frames are pending.
- Project identity in `tasks`, `context_entries` and `diagnostic_runs` is
  the project **path**. A moved project needs the remapping flow, not new rows.

## 2. App-global JSON and folders under `<userData>`

| File / folder | Owner | Notes |
| --- | --- | --- |
| `custom-agents.json` | `src/main/agents/custom-agents-store.ts` | User-defined agents |
| `agent-token-budgets.json` | `src/main/agents/agent-limits-store.ts` | Weekly budgets |
| `agent-autopilot.json` | `src/main/agents/autopilot-store.ts` | Global and per-project autopilot |
| `keep-awake.json` | `src/main/agents/keep-awake-store.ts` | |
| `agent-usage-cache.json` | `src/main/agents/usage/cache.ts` | Derived from agent transcripts. Can be rebuilt; no need to migrate |
| `shadow-repos/` | `src/main/agents/agent-changes.ts` | Agent change tracking. Decide: migrate or rebuild |
| `code-formatter.json` | `src/main/formatting/formatter-settings.ts` | |
| `window-zoom.json` | `src/main/window-zoom.ts` | |
| `imported-templates/` | `src/main/scaffolding/imported-template-store.ts` | User-owned snapshots. **Must migrate** |
| `catalog-cache/` | `src/main/scaffolding/catalog.ts` | Cache. Can be rebuilt |
| `extensions/` | `src/main/extensions/paths.ts` | Installed extensions and runtimes. Reinstall or migrate (decide) |
| `highlighting/` | `src/main/code-intelligence/highlighting-store.ts` | Downloaded grammars. Can be rebuilt |
| `api-studio-environments.json` | `src/main/api-studio/environment-store.ts` | **Secret values in plaintext**, keyed by project path and environment |
| `api-studio-requests.json` | `src/main/api-studio/request-store.ts` | App-side request store |
| `api-studio-responses/<projectKey>/` | `src/main/api-studio/request-store.ts` | Response bodies when not stored in the project |
| `api-studio-downloads/` | `src/main/api-studio/runner/response-file.ts` | |
| `api-studio-collections.json`, `api-studio-collection-bodies/` | `src/main/api-studio/custom-collections.ts` | Custom collections. **Must migrate** |
| `api-studio-allowed-hosts.json` | `src/main/api-studio/allowed-hosts.ts` | Host consent |
| `api-studio-docs.json` | `src/main/api-studio/docs/doc-store.ts` | |
| `popup-allowlist.json` | `src/main/browser/popup-policy.ts` | |
| `lazy-shield.json`, `lazy-shield-engine.bin` | `src/main/browser/lazy-shield.ts` | Preference must migrate. The engine is a cache |
| Logs, crash dumps | `src/main/diagnostics/logger.ts` (`app.getPath("logs")`, `"crashDumps"`) | Not migrated; keep readable |
| Temp: `lazify-agent-sessions/`, `lazify-lint-<pid>.sock` | `src/main/agents/session-lint.ts`, `src/main/linting/bridge/server.ts` | Ephemeral |

## 3. Project-local `.lazify/` (travels with the project)

The directory is created by `src/main/projects/lazify-directory.ts`, which also
appends `.lazify/` to `.gitignore` when the project is a Git repository.

| Path | Owner |
| --- | --- |
| `.lazify/api-studio/` (route cache) | `src/main/api-studio/route-cache.ts` |
| `.lazify/api-studio-routes.json` (superseded format, still read) | `src/main/api-studio/route-cache.ts` |
| `.lazify/api-studio/requests.json` | `src/main/api-studio/request-store.ts` |
| `.lazify/api-studio/responses/` | `src/main/api-studio/request-store.ts` |
| `.lazify/api-studio/environments.json` (names, order, non-secret values) | `src/main/api-studio/environment-store.ts` |
| `.lazify/api-studio/scripts.json` | `src/main/api-studio/script-settings.ts` |
| `.lazify/api-studio/docs/` | `src/main/api-studio/docs/brief.ts`, watched by `docs/draft-watch.ts` |
| `.lazify/sonar-scan.json` | `src/main/linting/scan/scan-store.ts` |
| `.lazify/extensions.json` | `src/main/extensions/project-manifest.ts` |

The new app must read and write these **in place** with the same formats. They
are shared by every copy of Lazify that opens the project, which includes the
Electron build during the transition.

## 4. Renderer `localStorage` (Chromium profile under `<userData>`)

These keys live in Electron's Chromium storage, not in files Lazify owns. A
Chain webview has a **different origin and storage**, so none of them carry
over automatically. Most of them hold settings or layout. **Two of them hold
the user's project list:**

- `lazify-workspace-projects`, `lazify-project-directory`, `lazify-active-project`
  (`src/renderer/shared/hooks/lazify-store/storage.ts`). This is the project
  list itself. **Must migrate.**
- `lazify-monitor-wall` (`src/renderer/features/agents/hooks/monitor-session-registry.ts`).
  Maps monitor panels to runs.

Other keys hold preferences or layout: theme, accent, language, date and time
formats, clock style, interface settings, pinned tools, route memory, browser
tabs, history, settings and search engine, editor tabs, code theme, terminal
height, script tabs, run-script overrides, desktop windows, note, focus timer
and personalisation, API Studio panel state, and collapsed projects. Find them
with `grep -rn 'const .*KEY = "lazify-' src/renderer`.

Migration path, decided 2026-10-09: read the backup copy of Chromium's
LevelDB with the Chain app's own reader (ticket 013), pinned by fixtures from
a real Chrome. The Electron app is not changed.

## 5. Bundled resources

`templates/*.json` (starters), `src/brain/resources/`, the locale files in
`src/renderer/i18n/lang/`, `build/` icons, and the legal texts. These ship
with the app; they are not migrated.

## Still to do (before Phase 3)

- [ ] Record the schema and version of each JSON store, plus an example of an
      empty and a typical record.
- [ ] Confirm the Windows and Linux `<userData>` paths.
- [ ] Decide migrate or rebuild for `shadow-repos/`, `extensions/` and `highlighting/`.
- [ ] Decide where API Studio secrets go (keychain capability vs encrypted store).
      Today they are plaintext, which the new app should not copy as-is.
- [ ] Design the `localStorage` export from the Electron app.
