# Lazify framework-neutral rewrite roadmap

**Purpose:** reproduce Lazify's product behaviour with a desktop framework other
than Electron without accidentally losing user data, native capabilities, or
long-running work. This is an implementation handoff for an AI agent or team,
not a proposal to rewrite the current application.

**Snapshot basis:** repository source, API boundary, tests, and product docs as
of 2026-10-04. The current implementation is Electron + React + TypeScript,
but Electron is an implementation detail. Preserve the contracts below; replace
the adapters behind them.


> **Safe execution update (2026-10-08):** This roadmap must be executed incrementally. The Electron implementation and original branch remain intact until explicit, separately reviewed retirement. Read the appended **Agent execution playbook** before any code changes.

## Read this first

### Non-negotiable migration rules

1. Do not begin by translating screens. First freeze the current capability
   contract, persisted-data formats, and event semantics.
2. Keep the existing Lazify data directory and project-local `.lazify/` files
   readable. Make a backup before any migration. Data must be imported, not
   silently reset.
3. A renderer/app reload must not unintentionally terminate terminals, agents,
   scans, downloads, or project creation. Reattach to recoverable runs.
4. Run external programs without invoking a shell unless shell semantics are
   explicitly required. Validate paths, working directories, URLs, and IPC/RPC
   payloads at the native boundary.
5. Do not expose unrestricted filesystem, process, or OS APIs to UI code. The
   replacement bridge must be narrow, typed, permission-checked, and
   capability-oriented.
6. Preserve current tests where they express user-visible behaviour. Port tests
   to the new stack before replacing an implementation; add contract tests for
   every bridge method and event.
7. Treat macOS, Windows, and Linux as distinct deployment targets. Native PTY,
   shell discovery, file dialogs, browser/webview, update, code-signing, and
   DMG support need platform-specific verification.

### Recommended target shape

Use four replaceable layers. Their names are illustrative, not prescribed.

```text
UI (any web/native UI framework)
        │ typed request/response + event client
Application core (framework-neutral TypeScript or chosen language)
        │ ports/interfaces
Platform adapters: filesystem · subprocess/PTYS · git · keychain · webview
        │
Desktop shell / OS APIs / bundled tools
```

Move the durable business logic in `src/brain/`, prompt building, API scanning,
task rules, template processing, formatting policy, and data models into the
application core. Replace the Electron main process with platform adapters,
and replace preload IPC with a versioned RPC/event bridge. Do not make a new UI
framework responsible for process ownership or persistence.

## Product scope inventory

The table is the parity checklist. “State” identifies where a rewrite must
preserve or deliberately migrate user-owned data.

| Area | Current user-visible capabilities | State / integration to preserve |
| --- | --- | --- |
| Home and navigation | Desktop-like home, project list, task summaries, live-agent overview, tool launcher, pinned tools, route memory | UI settings and navigation preferences |
| Projects and workspace | Select/import directories; sync and index projects; file tree; file/image/PDF previews; code tabs; find; project-wide search; symbols/definitions; diagnostics; open externally | Project paths, file/tab selection, project index/cache; filesystem permissions |
| Git | Branch/status/change views; file diffs; stage/unstage/discard; checkout; commit; pull/push | Git executable/auth environment; destructive-operation confirmations |
| Scripts and terminal | Discover package scripts; start/stop/restart sessions; interactive terminal input, resize, scrollback, links, terminal theme; restore live sessions | Durable run registry, PTY ownership and output backlog |
| AI agents | Built-in/custom agent catalog; launch/resume sessions; terminal-based conversations; file changes and diffs; activity/attention/done signals; branch data; per-agent usage/budgets; rate-limit state; keep-awake; autopilot and per-project controls | Agent definitions, session/run identity, transcript/log locations, budgets, custom agents, keep-awake/autopilot settings |
| Agent live monitor | Multi-project grid of agent/script terminals; add/clear/reorder/resize/rename panels; side rails for activity, changes, files, environment and usage; restore/rebind sessions after reload | Monitor layout and panel-to-run mapping; never mount two terminal views onto the same run without explicit multiplexing |
| Tasks | Project task board/list; priority, deadline, requirements and notes; task history; status events; reorder/delete; send task prompt to an agent; exact prompt/run audit trail | SQLite `tasks`, `task_agent_runs`, `task_status_events` |
| Prompt Builder | Deterministic agent-ready prompts; built-in and custom presets; template variables; global/project typed context (facts, rules, paths, commands); packs; active state; preset suggestion | SQLite `prompt_presets`, `context_entries`; built-ins and rendering rules must remain deterministic and offline |
| Project creation | Starter catalog; stack selection; local/imported template selection; configurable options; create directory; install dependencies/packages; progress and failures | Bundled `templates/*.json`, imported-template records, workflow/run events |
| Imported templates | Import an existing project; detect stack/features/file roles; choose included files; edit tree/name; package manifest; save/delete; provision a new project from it | Imported template snapshots and their source-relative tree |
| Dependencies | List/search npm packages; add/remove/install; outdated and audit reports; detect/fix compatible package versions | Package-manager choice and project package manifests/lockfiles |
| Environment files | List/create/read `.env*` files; edit, add, delete variables; preserve comments and surrounding source layout | Project-local files; line/key conflict handling |
| Developer environment | Scan runtime/tools; inspect/update/install/uninstall tools; NVM versions/default/use; package manager choice; ports/processes and stop actions; open terminal/editor; detect editors | Login-shell PATH semantics, OS install methods, tool scan cache, process permissions |
| Formatting | Global formatter defaults/mode/import organization; sample output; detect project formatter; format changed files; report outcome to code surfaces | Formatter settings and format event contract |
| Code quality and extensions | Extensions install/remove/enable; SonarLint/Tailwind providers; install progress; lint a file; start/stop statusful Sonar scan; findings; turn findings into agent tasks | Extension registry/store, Java runtime/assets, scan state and report locations |
| Browser and preview | Integrated browser tabs/history/address input; guest web content; search engines; back/forward swipe; popup policy; permissions; error UI; ad/tracker protection (Lazy Shield); send page to agent; picture-in-picture | Browser history/settings, allowed popup origins, shield state; a secure webview equivalent |
| API Studio | Scan local projects for routes (OpenAPI, Express, NestJS, FastAPI, Flask, Laravel, ASP.NET and related rules); route review/details; environment variables/secrets; build/run HTTP requests; response files; pre/post-request scripts with Postman facade; custom collections/folders/requests; tabs/examples; export Postman; host allow-list | `.lazify/api-studio/` user data, route identity overlay rules, response-file lifecycle, secrets handling, host consent |
| API documentation | Collection-doc editor; brief/questions/draft workflow; watch imported drafts; preview/open/export docs; logo selection | Project-local documentation draft/output and watcher semantics |
| DMG compiler | macOS-only app selection/inspection; destination and artwork selection; layout preview; build progress; compile DMG | macOS-only native commands and image assets; explicitly omit or redesign for non-mac platforms |
| App and UI settings | Appearance/accent/code theme/zoom/interface density; language; date/time; browser and search engine; editor/file opening; local runtime; diagnostics; updater; legal/about | User preferences, generated translations, update state |
| Distribution and reliability | Splash; crash logging/diagnostic paths; update check/download/restart/install; window zoom; app menu; platform packaging/icons/signing | Release-channel configuration, log/artifact paths, code signing and updater trust chain |
| Marketing site | Separate Next.js public site: product showcase, downloads, donate, privacy and terms | It is independent of the desktop rewrite; keep its deployment and download links working |

## Existing contracts to preserve

### Public capability groups

`src/preload/api/` is the current privileged interface and should become the
initial RPC contract. Keep its operations grouped and versioned:

| Contract group | Required operation families |
| --- | --- |
| `agents` | catalog/custom agents, sessions, terminal creation, attention/done/activity events, usage/budgets, autopilot, keep-awake |
| `apiStudio`, `apiDocs` | scan/read routes; environments; requests/collections; execution/scripts; allowed hosts; response files; documentation lifecycle |
| `browser`, `media` | tabs/webview policies, popup/shield/swipe events, PiP state |
| `projects`, `git`, `packages`, `scripts`, `env` | project import/index/search/assets; Git actions; packages; PTY sessions/events; environment-file edits |
| `workflow`, `templates` | starter/template listing and creation/provisioning progress; imported-template lifecycle |
| `prompts`, `tasks` | presets/context/building; task CRUD/history/reorder and agent-run records |
| `environment`, `system`, `dmg` | tool and runtime management; native dialogs/file reveal/open/editor/terminal/commands/zoom/logs; macOS DMG operations |
| `formatting`, `linting`, `extensions`, `codeIntelligence`, `updater` | format/lint/scan progress; extension jobs; definitions; update state changes |

For every method, document: request schema, response schema, failures, required
permissions, cancellation behaviour, ownership of generated files, and whether
it emits a state event. Keep event subscriptions explicitly disposable to avoid
duplicate listeners after navigation.

### Persistent data inventory

1. **SQLite application database** — migrations currently create prompt presets,
   context entries, tasks, task-agent runs, task status events, and diagnostic
   runs. Preserve IDs, timestamps, ordering, statuses, JSON columns, indexes,
   and foreign-key cascades. Import transactionally and validate row counts.
2. **User settings/stores** — agent limits/custom agents/autopilot/keep-awake,
   formatting, extensions, browser/history, UI settings, imported templates,
   API Studio preferences and caches. Locate every store before implementation
   and define a schema/version for each one.
3. **Project-local Lazify data** — particularly `.lazify/api-studio/`, saved API
   request/collection data, docs drafts/exports, and API response bodies. These
   travel with a project and cannot be replaced with app-global storage.
4. **On-disk run artifacts** — logs, transcripts, scanner output, downloaded
   assets, response files and diagnostic evidence. Keep paths relative where
   feasible; never assume old absolute paths remain valid after a project move.
5. **Bundled resources** — starter descriptors, package presets, language
   assets, extension resources, icons, legal text, and native helper binaries.

### Identity rules that must not change casually

- Project identity is currently a path. Normalize paths consistently, resolve
  symlinks deliberately, and design a relocation/remapping flow rather than
  duplicating project records after a move.
- Task and prompt records rely on stable IDs and project-path scopes.
- API route identity is derived from project, method, normalized path, and a
  source anchor. A rescan refreshes scanner-owned fields while retaining
  user-owned saved requests and annotations.
- PTY/agent/script run IDs must be unique and routable from every subscription.
  A client reconnect must prove it is attaching to the intended live run.
- Imported template IDs must outlive editing; generated projects must never
  mutate their saved source template.

## Rewrite sequence

Complete each phase before starting the next. A “pass” means automated tests
and manual checks on every supported OS, not just a typecheck.

### Phase 0 — Create the rewrite dossier

- [ ] Record current app version, supported OS/architectures, release channel,
  data-directory locations, and every app/project-local file created by Lazify.
- [ ] Generate an API manifest from `src/preload/api/*.ts`, including all event
  payloads. Add request/response JSON schemas or equivalent typed-IDL.
- [ ] List every persistent store, its schema, location, owning module, and
  migration strategy. Include secrets and redact them from diagnostic output.
- [ ] Make a feature test matrix from `tests/main`, `tests/renderer`, and
  `tests/brain`; link every test to a feature above.
- [ ] Record baseline smoke-test outputs for Windows/macOS/Linux and archive a
  representative user-data fixture plus a sample project fixture.

**Exit criterion:** an agent can identify every feature's source, contract,
data, OS dependency, and acceptance test without reading the old UI.

### Phase 1 — Establish the framework-neutral core

- [ ] Define domain models and ports for data storage, filesystem, dialogs,
  process/PTY management, Git, HTTP, browser surface, updater, notifications,
  scheduler/watchers, credentials, and OS power management.
- [ ] Extract pure modules first: `src/brain/`, prompt assembly, route parsing
  and API rule sets, template validation/normalization, package matching,
  text/file search, diff parsing, task state rules, and request construction.
- [ ] Replace implicit Electron globals with injected ports and typed errors.
- [ ] Keep file formats and deterministic output byte-for-byte compatible where
  possible; use golden fixtures for prompts, route scans, package fixes and
  template transformations.

**Exit criterion:** pure-core tests run with fake adapters and without the old
desktop runtime.

### Phase 2 — Build a secure native platform layer

- [ ] Implement the chosen shell's secure UI-to-native bridge with allow-listed
  methods only. Version it (`v1`) and reject malformed/unrecognized payloads.
- [ ] Provide native adapters for dialogs, filesystem access, directory
  selection, safe external URL opening, editor/terminal launches, notifications,
  zoom/window controls, logs and crash reporting.
- [ ] Implement a durable process supervisor for commands, scripts and agents:
  start, write, resize, output backlog, status, terminate, reconnect, and
  cleanup. Confirm child-process tree termination on each OS.
- [ ] Implement Git, package-manager, runtime/tool scan, port lookup/stop and
  NVM adapters with a login-shell environment compatible with current behaviour.
- [ ] Implement watchers with debouncing, cancellation and clean disposal.
- [ ] Add a safe credential/secrets adapter. API Studio secret values must not
  enter logs, exports, generated docs, crash reports or analytics.

**Exit criterion:** contract tests can drive the platform layer headlessly;
interactive terminal and an agent/session survive UI reload and can reattach.

### Phase 3 — Migrate data before building the full UI

- [ ] Ship a read-only inspector that finds old data, reports schemas/versions,
  validates records, and creates a timestamped backup.
- [ ] Implement idempotent migration into the new stores. Preserve IDs and
  ordering; record migration version and a rollback/recovery path.
- [ ] Import SQLite data transactionally; run foreign-key and integrity checks.
- [ ] Import settings, custom agents, imported templates, API Studio files,
  history and user preferences. Present unresolved paths for user repair.
- [ ] Test upgrades from empty, typical, large, and partially corrupted data.

**Exit criterion:** a copied real profile opens with the same tasks, prompts,
templates, settings, API collections, and safely recoverable project links.

### Phase 4 — Restore the smallest vertical product slice

- [ ] Implement navigation/app shell, theming, localization, settings storage,
  project picker, project index, workspace file tree, source preview and errors.
- [ ] Add scripts and interactive terminal with session restoration.
- [ ] Add agent selection/launch/resume and task-to-agent prompt handoff.
- [ ] Add home summaries and user-visible failure/progress states.
- [ ] Port accessibility: keyboard navigation, focus restoration, screen-reader
  labels, reduced-motion support, contrast, and desktop window controls.

**Exit criterion:** a user can open a project, run a command, give an agent a
task, reload the app, reconnect, and understand failures without the old app.

### Phase 5 — Restore project-authoring workflows

- [ ] Port starter catalog and project-creation workflow, including progress,
  cancellation, dependency installation and failure recovery.
- [ ] Port imported-template analysis/editor/provisioning and tree safeguards.
- [ ] Port packages, environment-file editor, Git, project health, code search,
  symbols/definitions, diagnostics, formatting and extension-driven linting.
- [ ] Port developer-environment tooling with explicit elevated-action and
  destructive-action confirmations.
- [ ] Port Prompt Builder and task lifecycle, retaining exact deterministic
  prompt rendering and run/status history.

**Exit criterion:** all project manipulation flows have parity fixtures and
failure/cancellation paths, not only success demos.

### Phase 6 — Restore complex tools

- [ ] Port the integrated browser with an isolated guest-content model, history,
  popup/permission policy, tracker blocking, browser error states, agent handoff
  and media PiP. Do a security review before enabling arbitrary navigation.
- [ ] Port API Studio in slices: route inventory/scanners → route details →
  environments/secrets → request execution → scripts → saved/custom collections
  → response files/exports → documentation workflow. Preserve source warnings
  rather than pretending dynamic routes were discovered exactly.
- [ ] Port the agents workbench and then live monitor mode. Restore session
  hydration before layout polishing; own each PTY exactly once or support a
  tested terminal multiplexer.
- [ ] Port diagnostic runs and extension management. Retain scan cancellation,
  progress events and artifact paths.
- [ ] Port the DMG compiler only on macOS. For other target frameworks/platforms,
  either isolate it as a macOS plugin or document it as intentionally unavailable.

**Exit criterion:** complex tools pass their source-derived suites plus manual
security, load and reload tests.

### Phase 7 — Distribution, updates and release readiness

- [ ] Recreate platform builds, icon generation, signing/notarization strategy,
  native dependency rebuilds, auto-update metadata, rollback behaviour and
  release CI for every supported OS/architecture.
- [ ] Verify update transitions from a production-like prior build and ensure
  user data, active run recovery, updater state and release links survive.
- [ ] Keep the marketing site independent; update downloads only after signed
  artifacts and updater feed are live.
- [ ] Write support runbooks for logs, data backup/restore, failed migration,
  crashed process, failed update, missing terminal/runtime and project relocation.

**Exit criterion:** signed installers update a prior release without data loss,
and release validation is reproducible in CI.

## Feature-by-feature acceptance checklist

An implementation is not feature-complete until the corresponding checks pass.

### Core project workbench

- [ ] Import normal, monorepo and non-JS projects; re-open them after restart.
- [ ] View/edit-safe previews for text, image and PDF assets; find/search links
  land on the correct file and line.
- [ ] Run and stop scripts; preserve terminal scrollback; support paste, links,
  resize and session rebind.
- [ ] Git status/diff/actions return actionable errors and never discard/stage
  files without explicit confirmation.

### Agents, prompts and tasks

- [ ] Built-in and custom agents launch, resume and report lifecycle events.
- [ ] Usage, budget/rate-limit, attention, autopilot and keep-awake state match
  the existing feature semantics.
- [ ] Prompt Builder remains offline and deterministic for identical inputs.
- [ ] Task history retains task status source and exact sent prompt after an
  agent run ends.
- [ ] Monitor wall handles mixed projects, script and agent panels, termination,
  reordering/layout, errors, and reload recovery.

### Scaffolding and project maintenance

- [ ] Every bundled starter and imported template can be inspected, created and
  provisioned without mutating its template source.
- [ ] Package search/install/remove/audit/outdated/version-fix respects the
  chosen package manager and project root.
- [ ] `.env` edits preserve unrelated contents and detect stale line/key edits.
- [ ] Tool scans match login-shell visibility; potentially disruptive installs,
  updates and port kills require clear confirmation.

### API Studio and browser

- [ ] Static route scans retain source evidence, confidence and unresolved-route
  warnings across all supported framework adapters.
- [ ] Stored request data survives a rescan when route identity is unchanged.
- [ ] Secret variables remain hidden outside request execution; remote hosts need
  consent; TLS exceptions are narrow and visible.
- [ ] Pre/post-request scripts honor the documented Postman-compatible façade,
  timeouts and error reporting.
- [ ] Browser guest content cannot access application privileges; popups,
  navigation, permissions and tracker blocking follow stored policy.

### Quality, data and operations

- [ ] Extension installation, lint scans, formatting and generated fix tasks
  show progress/cancellation/results and recover from missing dependencies.
- [ ] All supported locales render; translation source files regenerate the
  typed translation artifact rather than hand-editing generated code.
- [ ] Updater, crash logging, support diagnostics and data migration have
  redaction tests.
- [ ] macOS DMG output has an integration test on macOS; absence on other OSes
  is intentional and plainly communicated.

## Test strategy for a rewrite agent

1. **Characterization tests:** retain/port the existing pure and renderer tests
   first. Add fixtures before changing an ambiguous legacy behaviour.
2. **Bridge contract tests:** run each RPC handler against fake and real native
   adapters. Include invalid paths, malformed payloads, cancellation and
   subscription disposal.
3. **Data migration tests:** migrate representative old profiles, run integrity
   checks, open the new app, migrate a second time, and verify no duplication.
4. **End-to-end desktop tests:** cover the vertical slice and every destructive
   operation on each OS; use real PTYs, Git repositories and local API fixtures.
5. **Security tests:** path traversal, arbitrary command injection, hostile
   project files, malicious web pages, unsafe URL schemes, untrusted extensions,
   secret leakage, and update-signature failures.
6. **Reliability tests:** renderer/UI reload with active runs; app crash recovery;
   cancellation during create/install/scan/update; locked files; offline mode;
   slow/large projects and high-output terminals.

## Source map for future agents

| Need | Canonical current location |
| --- | --- |
| Full native/UI contract | `src/preload/api/` and matching `src/main/ipc/` |
| Current UI feature map | `src/renderer/features/` and `src/renderer/app/app-routes.ts` |
| Process, OS and persistence work | `src/main/pty-runner.ts`, `src/main/command-runner.ts`, `src/main/environment/`, `src/main/db/` |
| Agents and sessions | `src/main/agents/`, `src/renderer/features/agents/` |
| Project/workspace/Git | `src/main/projects/`, `src/main/ipc/git.ts`, `src/renderer/features/workspace/` |
| Prompts/tasks | `src/main/prompts/`, `src/main/tasks/`, `src/renderer/features/prompts/`, `src/renderer/features/tasks/` |
| Templates/scaffolding | `src/brain/template-engine/`, `src/main/scaffolding/`, `templates/` |
| API Studio | `src/main/api-studio/`, `src/renderer/features/api-studio/`, `docs/api-studio.md` |
| Browser/PiP | `src/main/browser/`, `src/main/media/`, `src/renderer/features/browser/` |
| Formatting/lint/extensions | `src/main/formatting/`, `src/main/linting/`, `src/main/extensions/` |
| Release/packaging | `package.json`, `electron-builder.*.yml`, `build/`, `src/scripts/`, `docs/1.0-release-checklist.md` |
| Behavioural regression suite | `tests/brain/`, `tests/main/`, `tests/renderer/` |

## Explicit out-of-scope decisions to make before implementation

These are product decisions, not safe assumptions for an AI agent:

- Which target shell/framework and languages are approved, and whether the UI
  remains React or moves to native rendering.
- Whether Linux remains a supported release target or only a development build.
- Whether the embedded browser remains part of the product; its replacement
  determines a substantial security and native-webview design.
- Whether automatic updates, custom extension installation, DMG compilation and
  all current agent CLI integrations ship in the first rewritten release.
- The supported data migration window and whether rollback to Electron must be
  possible after the new app has written data.
- The signing/notarization credentials and update-feed ownership for the new
  distribution system.

Until these choices are made, an agent should complete Phases 0–3 and the
framework-neutral core, but should not silently remove or redefine features.

## Old-versus-new rebuild comparison checklist

Use this section as the release gate for the replacement app. Copy it into the
rewrite tracking issue and fill the **Old evidence**, **New evidence**, and
**Result** columns with links to recordings, test runs, fixture locations, or
signed-off issue numbers. Do not use a simple “looks similar” judgement.

**Result values:** `Not started`, `Different by design (approved)`, `Pass`, or
`Blocker`. “Different by design” needs a product decision, migration note, and
user-facing release-note entry before it can pass.

| Area | Compare this exact behaviour | Old evidence | New evidence | Result |
| --- | --- | --- | --- | --- |
| Launch and recovery | Cold launch, first-run setup, splash/error path, window restore, UI reload while work is live, clean quit, crash recovery |  |  |  |
| Navigation/settings | Every route, tool entry, pinned tool, back path, route memory, theme/accent/zoom/language/date-time/browser settings |  |  |  |
| Projects | Select/import/sync a directory; reopen after restart; normal project, monorepo, inaccessible directory and moved project behaviour |  |  |  |
| Workspace files | Tree shape, expansion/selection, code/image/PDF preview, tabs, find, project search, file/line targeting and external-open actions |  |  |  |
| Git | Branch/status/diff correctness; checkout, stage, unstage, discard, commit, pull and push success/failure/confirmation flows |  |  |  |
| Scripts and terminal | Script discovery; launch, input, paste, resize, scrollback, links, stop/restart, exit errors, session list and reload rebind |  |  |  |
| Agents | Agent listing/custom-agent CRUD; launch/resume; terminal ownership; attention/done/activity; files/diffs; usage/budget/rate limit; autopilot/keep-awake |  |  |  |
| Agent monitor | Mixed-project panels; script/agent launch; layout/rename/size/reorder; rails; clear/termination; error state; reload rehydration |  |  |  |
| Prompt Builder | Preset/context CRUD and active packs; built-in protection; identical inputs produce byte-for-byte identical generated prompts |  |  |  |
| Tasks | CRUD, ordering, priority/deadline/status; status history/source; task prompt handoff; task-agent-run prompt and completion audit |  |  |  |
| Starter projects | Every bundled starter, all options, creation path, package installation, progress, cancellation and cleanup/error behaviour |  |  |  |
| Imported templates | Import detection, included-file selection, tree/name editing, package manifest, save/delete, generated-project output and source isolation |  |  |  |
| Dependencies | Search/list/add/remove/install, outdated/audit, package-manager selection and compatible-version matching/fixing |  |  |  |
| Environment files | List/create/read/edit/add/delete `.env*`; comments/order/unrelated lines retained; stale edit conflict handling |  |  |  |
| Developer environment | Tool scan/probe/install/update/uninstall; NVM list/default/use; port detection/termination; editor and terminal opening |  |  |  |
| Formatting and code quality | Global/project formatter selection, sample/format result; extension lifecycle; lint/finding display; scan progress/cancel; fix-task creation |  |  |  |
| Browser and PiP | Tabs/history/address/search; guest page errors; navigation/swipe; permissions/popups; shield; agent handoff; media picture-in-picture |  |  |  |
| API Studio scanning | Every supported framework fixture; route count/identity/details/source evidence/confidence; dynamic-route warnings; rescans preserve user data |  |  |  |
| API Studio requests | Environments and secret masking; host approval; request interpolation/body formats; TLS policy; responses/files; pre/post scripts and errors |  |  |  |
| API Studio collections/docs | Route/custom collections, folders/order/tabs/examples, request storage, Postman export, documentation draft/watch/preview/open/export/logo |  |  |  |
| DMG compiler | macOS app inspection, artwork/layout preview, build progress, output mount/install behaviour and errors |  |  |  |
| Updates/diagnostics | Check/download/install/update-state transitions; failed update; logs/crash artifacts/diagnostic paths; redaction; relaunch |  |  |  |
| Legal and marketing | In-app legal text/licenses; website pages and all platform download links still target valid signed builds |  |  |  |
| Localization/accessibility | All shipped locales; generated translation workflow; keyboard-only navigation; focus restore; labels; contrast; reduced motion |  |  |  |
| Packaging/platforms | Installer/build/launch/update on each supported OS and architecture; signing/notarization; native dependency and shell/PATH behaviour |  |  |  |

### Cross-cutting comparison gates

These gates apply to every row above. A feature row cannot pass while a
relevant cross-cutting gate fails.

| Gate | Required comparison |
| --- | --- |
| Data fidelity | Start with a backed-up production-like old profile, migrate it once, restart twice, then compare record counts, stable IDs, ordering, task histories, presets/context, settings, templates and API Studio data. Confirm the old application can still open its untouched backup. |
| API/RPC compatibility | Exercise every current preload capability and subscription from the generated manifest. Compare successful payloads, typed failures, cancellation, event order and listener disposal. |
| Process lifecycle | Compare child process/PTY start directory and environment, terminal output and resize, stop signal/tree cleanup, session restoration, agent attribution and UI-reload recovery. |
| Filesystem safety | Compare allowed paths and dialog behaviour; test missing/locked/symlinked files, project moves, invalid filenames, permission denial, destructive action confirmation and cleanup after cancellation. |
| Security | Test untrusted projects/pages/extensions, command arguments, URLs, archive paths, secrets in logs/exports, browser privilege isolation, host consent, TLS exceptions and update signature failure. |
| Offline/error handling | Disconnect the network; remove Git/package manager/agent binaries; exhaust disk space; interrupt installs/scans/updates; use invalid project manifests. Compare helpful state, recovery and absence of corrupted data. |
| Performance | Compare launch time, project indexing/search, route scanning, large output terminals, multi-panel monitor refits, memory after repeated navigation and responsiveness on a representative lower-spec machine. Set an approved threshold before declaring parity. |
| OS matrix | Run the relevant checks on each supported OS/architecture. Mark macOS-only DMG operations `N/A` elsewhere; do not mark them as passed on another OS. |

### Comparison procedure

1. Freeze a versioned old-app build, a fixture profile, and fixture projects.
   Never compare an arbitrary moving development checkout.
2. For each row, execute the same scripted path in the old and new apps. Record
   screenshots/video only as supplementary evidence; store machine-readable
   outputs for prompts, scans, requests, migrations and events.
3. Compare output by stable identifiers and normalized paths/timestamps, not by
   array position or incidental rendering details.
4. Classify every mismatch. Fix it, or obtain explicit approval for a documented
   intentional difference. Do not hide a missing capability behind a redesigned
   screen.
5. Re-run all passed rows after changes to the platform bridge, persistence,
   process supervisor, route identity, or shared core: those are load-bearing
   dependencies.
6. Ship only when every applicable row and cross-cutting gate is `Pass` or an
   approved `Different by design`, with no unresolved `Blocker`.


---

# Lazify incremental rewrite — agent execution playbook

**Status:** Implementation guidance to accompany `framework-neutral-rewrite-roadmap.md`.  
**Source baseline:** Lazify Electron + React + TypeScript repository snapshot documented 2026-10-04.  
**Principle:** *Strangle and replace one capability at a time. Never erase the functioning implementation to make the new architecture fit.*

> This document adds an execution policy to the existing roadmap. It does not imply that repository changes have already been made or that a target desktop stack has been approved. The existing roadmap remains the source for feature scope, interface groups, persistence inventory, phased goals, and parity gates.

## 1. Agent operating contract — read before editing

### Hard prohibitions

1. **Never delete, reset, overwrite, or force-push the working Lazify branch.** Never run `git branch -D`, `git reset --hard`, `git clean -fdx`, `git push --force`, or destructive equivalents as part of migration. Escalate if a genuinely necessary operation would be destructive.
2. **Do not bulk-delete Electron code, existing `src/main`, `src/preload`, `src/renderer`, or working features.** Electron remains the reference executable until each replacement is validated and the owner separately approves retirement.
3. **Do not turn the roadmap into an instruction to rewrite the whole repository in one commit.** One module / one contract family / one testable vertical slice per change set.
4. **Do not rewrite data in place on first run or discard `.lazify/`, user settings, SQLite, templates, transcripts, or run logs.** Back up, inspect, dry-run, then migrate with verification and rollback strategy.
5. **Do not repurpose an existing run ID, silently kill a PTY on navigation, expose privileged OS APIs to web content, or leak secrets in logging.**
6. **Do not remove existing tests to make new code pass, lower test coverage gates opportunistically, or mark a feature `Pass` based on UI appearance alone.**
7. **Do not claim OS parity without running the affected checks on that OS.** Label untested platforms `Not tested`, not `Pass`.
8. **Never interpret missing clarity as authorization to remove a feature.** Record a decision and retain the old route/adapter.

### Mandatory workflow for every agent task

1. Read this playbook and the existing rewrite roadmap, especially the source map and acceptance row for the affected area.
2. Inspect only relevant source/contract/tests and identify old entry points; document them in the task file.
3. Capture current behaviour in tests/fixtures before touching implementation.
4. Create a **new feature branch from an intact baseline**. Confirm `git status` is clean or explicitly document and preserve pre-existing changes.
5. Implement additive code or a compatibility adapter; keep old entry points operational.
6. Compare old and new behaviour with identical fixtures; run focused tests plus typecheck/lint as available.
7. Provide proof, risk, data implications, rollback instructions, and an explicit **Not removed** list in the handoff.
8. Merge only after review; delete old code only under the retirement protocol in §10.

### Explicit no-go conditions

Stop the change set and report a blocker if a migration cannot preserve required data, cannot recover an active run, changes privilege boundaries without a security review, loses an unimplemented feature, needs a destructive Git operation, or requires an unapproved architecture choice.

## 2. Repository preservation and branch strategy

The exact branch names below are **suggested conventions**, not assertions about the existing repository. The agent must discover the actual protected/default branch before creating anything.

| Role | Suggested convention | Rules |
| --- | --- | --- |
| Existing Electron baseline | Existing default branch; optionally `legacy/electron-baseline-YYYYMMDD` | Keep buildable; protect against force-push/deletion; never use as a scratch branch. |
| Long-lived integration | `rewrite/integration` | Receives reviewed additive work; must remain bootable and testable. |
| Short-lived task branches | `rewrite/phase-N-feature-name` | Small, focused PRs; branch from current integration; no sweeping unrelated refactors. |
| Releases | Tagged, immutable revisions | Record exact commit, artifacts, schema version, feature flags and test evidence. |

**Initial commands (read-only / non-destructive):**

```bash
git status --short --branch
git branch -vv
git remote -v
git log -5 --oneline
```

After identifying the correct baseline and confirming clean/preserved worktree, create an integration branch only if one does not already exist:

```bash
git switch -c rewrite/integration
# For each focused task, from the reviewed integration branch:
git switch -c rewrite/phase-1-extract-prompt-core
```

Do not blindly run these exact example commands on a dirty repository or where a branch already exists. To maintain a simultaneous runnable reference, use a separate Git worktree **after checking the actual directory and branch**:

```bash
# EXAMPLE ONLY — choose a safe existing parent directory
# git worktree add ../lazify-electron-reference <actual-baseline-ref>
```

Before editing, record baseline commit SHA, worktree status, known failing tests, supported OS targets, and working startup/build commands in `docs/rewrite/00-baseline.md`. Keep the baseline branch/revision available for comparisons, and maintain an untouched backed-up sample profile.

## 3. Documentation layout (create additively)

Create a `docs/rewrite/` directory without replacing existing docs:

```text
docs/rewrite/
  README.md                  # links + current phase / scope / decisions
  00-baseline.md             # immutable source baseline, commands, OS matrix
  01-capability-inventory.md # mapped to original roadmap feature table
  02-contract-manifest.md    # every preload request/response/event + owner
  03-data-inventory.md       # user stores, paths, schemas, migration strategy
  04-architecture-decisions.md # ADR list and approved target boundaries
  05-work-queue.md           # granular migration tickets + dependency ordering
  06-parity-matrix.md        # old evidence / new evidence / result
  07-test-matrix.md          # characterization, contract, E2E, OS checks
  08-migration-ledger.md     # schema migrations and validations
  09-rollback-and-recovery.md # release and per-feature fallback instructions
  10-release-readiness.md    # smoke tests, signing, update gates
  tickets/                   # one file per change set, using §4 template
  evidence/README.md        # where to store logs, fixture IDs, recordings
```

The agent can create these empty/skeleton documents before writing replacement functionality, but cannot pretend inventories are complete without inspecting the repository.

## 4. Standard one-feature migration ticket

Copy this template to `docs/rewrite/tickets/NNN-short-name.md` before coding:

```markdown
# NNN — [capability] (phase / status)

## Objective and why now
## Source-of-truth references
- Existing capability table row:
- Old source paths / public preload API:
- Old tests / golden fixtures:
- Persistent data owned or touched:
- Required OS behaviour:

## Current observable behaviour
- Happy path:
- Failure/cancel path:
- Event sequence / reattachment:

## Target boundary
- Core interface and data types:
- Old adapter remains available via:
- New adapter implementation / feature flag:
- Permissions and trust boundary:

## Execution steps (small commits)
1. Add failing characterization/contract test.
2. Add typed interface without changing callers.
3. Wrap existing Electron behaviour behind the interface.
4. Implement replacement behind same interface.
5. Route internal/test traffic to replacement behind default-off flag.
6. Run parity; document mismatch and fix.
7. Enable for narrowly scoped opt-in users only after checks.

## Acceptance checklist and evidence
- [ ] Old implementation still runs
- [ ] Focused old-vs-new contract tests pass
- [ ] Error/cancellation/event parity checked
- [ ] Data safety and secrets checked
- [ ] Relevant platform checks performed (record untested OS)
- [ ] Rollback tested with old adapter enabled
- [ ] No unrelated files deleted

## Rollback (exact steps, data compatibility constraints)
## Changed files / commits
## Open questions / reviewer approval
```

**Definition of done:** Ticket includes meaningful test evidence and reviewer approval; its parity row is `Pass` or an explicitly approved `Different by design`; the old implementation is still recoverable. `Not started`, `Blocker`, and untested platform checks cannot be hidden.

## 5. Strangler architecture and safe routing

Do not create an all-new app that requires deleting Electron to run. First build an abstraction that the **existing** Electron app can use:

```text
Existing React UI  ──────────┐
                             v
                     Typed capability client
                             |
                      Versioned contract
                             |
                        Capability router
                        /            \
                Legacy adapter     New adapter
                 (Electron)      (new native shell)
                        \            /
                        Stable core services
                        + migration-safe stores
```

The diagram shows conceptual responsibilities, not an obligation to run both desktop shells in the same process. During extraction, the Electron app uses the shared interface with the legacy adapter; when a target shell exists, it hosts a new adapter implementing the same contract. Always isolate privileged operations from guest browser content.

### Feature flags

- Default to the proven legacy path (`legacy`) in the existing shipping app.
- Support an explicit `new` implementation flag at **capability-family granularity** (e.g., prompt builder, route scan, one file-dialog operation), not a single `rewriteEverything` switch.
- A flag must identify required schema version, OS support, owner, and fallback behaviour.
- Use **shadow comparisons only for read-only/deterministic operations**. Do **not** double-execute writes, installs, terminal launches, Git commands, HTTP requests, or agent prompts to compare results.
- New persisted writes require versioned format compatibility or a clearly approved one-way migration; rolling back a UI flag is not equivalent to rolling back transformed data.

### Contract policy

For every method under `src/preload/api/` and matching `src/main/ipc/`, freeze its name, argument schema, response, typed errors, events, cancellation, subscription disposal, and authorization. Build a contract test against the Electron implementation **before** implementing the new adapter. Event parity includes run identity, event ordering, reconnect rules, dropped-output handling, and duplicate subscription prevention.

## 6. Step-by-step order for an AI agent

### Sprint A — Establish safeguards (no product replacement)

1. Read source map and enumerate existing app commands. Do not guess command names.
2. Record baseline SHA, branch protections, start/build/test behaviour, representative user profile and sample projects.
3. Copy or archive profile/test fixtures **without** including plaintext API tokens or secrets in version control.
4. Create `docs/rewrite/` indexes, tickets, and initial parity table from roadmap.
5. Generate preload and event manifest with stable names and owners.
6. Capture a baseline test report, including existing failures; distinguish regressions from pre-existing failures.
7. Deliver docs-only PR. **Gate A:** baseline reference remains runnable; no existing source removal.

### Sprint B — Extract one pure, low-risk feature

1. Choose a self-contained `src/brain/` deterministic helper, prompt renderer, or route-parser routine with existing tests.
2. Capture golden fixture inputs and exact old outputs.
3. Introduce a pure typed core interface and place implementation behind it.
4. Make existing Electron call the extracted code through its adapter.
5. Prove exact output parity and no UI/API change; commit separately.
6. **Gate B:** original Electron UI works; old/new tests pass; rollback is code-only.

### Sprint C — Introduce an adapter boundary (keep Electron)

1. Select a narrow privileged operation (for example, a read-only tool scan or file-dialog method).
2. Map IPC schema and permission checks.
3. Add core port/interface and Electron adapter; replace **only that call site**.
4. Run invalid input, permissions, cancel, and disposal tests.
5. **Gate C:** no broad `src/preload/` removal; typed interface stable.

### Sprint D — Prove the target native shell as a spike

1. Obtain a recorded decision on shell, UI rendering, OS targets, embedded-browser support, updates, and native PTY strategy. If undecided, keep work to phases 0–1 and adapters that do not presume a shell.
2. Create an isolated `apps/<approved-shell>/` or separate bounded package. Do not rename or move the entire Electron tree.
3. Implement a trivial read-only typed bridge method and platform smoke test.
4. Test packaging/runtime characteristics before trying terminals or browsers.
5. **Gate D:** old app and native spike build independently; neither owns the other's data directory by default.

### Sprint E — Durable process lifecycle (high risk)

1. Document current PTY runner, command runner, agents/scripts IDs, session events, start environment, and termination semantics.
2. Add a run-registry abstraction and tests for start/input/resize/backlog/stop/crash/reconnect.
3. Preserve old Electron path; introduce a separate supervisor behind the interface.
4. Test reload and reconnect without duplicate PTY owners; test process-tree termination and slow/high-output cases on each target OS.
5. **Gate E:** no user-facing cutover until a running agent/script survives UI reload and the intended run is reattached safely.

### Sprint F — Data migration in isolation (high risk)

1. Locate all SQLite, preference, imported-template, `.lazify/api-studio/`, and artifact stores from live source, not assumptions.
2. Build read-only discovery and validation tools.
3. Backup profile and record checksums/row counts; redact secret values from reports.
4. Implement migration **into a separate destination** in a transaction where possible.
5. Test clean, large, old-version, partial-corruption, interrupted, and second-run (idempotency) cases.
6. Compare stable IDs, counts, ordering, references, and loadability; verify rollback on backup.
7. **Gate F:** no forced migration of production profile; unresolved path remapping is presented, not silently discarded.

### Sprint G — Vertical slices and full feature parity

1. Restore the roadmap's Phase 4 minimum slice: navigation → projects → file view → terminal → agent handoff → reload/reconnect.
2. Add phase-5 workflows one family at a time: scaffolding/templates, packages, `.env`, Git, developer environment, formatting/extensions, prompts/tasks.
3. Add phase-6 complex surfaces only after native-security design is approved: browser guest content, API Studio, agent monitor, DMG compiler on macOS.
4. For every slice, leave old implementation intact, add evidence to the corresponding parity row, then switch controlled opt-in via capability flags.
5. **Gate G:** all supported workflows and destructive/cancel/error paths have evidence; no unapproved omitted features.

### Sprint H — Release and gradual cutover

1. Validate installer/updater/signing, target architectures, clean install and upgrade from a backed-up old profile.
2. Establish a reversible release fallback for app binaries **and a documented compatible data strategy**.
3. Run all cross-cutting gates (security, data, lifecycle, filesystem, offline, performance, OS matrix).
4. Ship staged/opt-in releases if available; collect crash/regression evidence without logging secrets.
5. Keep Electron builds and baseline sources until retirement approval (§10).
6. **Gate H:** signed release passes matrix; marketing downloads only change after verified artifacts are available.

## 7. Safe change-set sizing and checkpoints

- Aim for one capability boundary and associated tests per PR; avoid multi-thousand-line mechanical transformations spanning unrelated modules.
- Prefer additive commits in this order: **tests/fixtures → types/ports → legacy wrapper → new adapter → routing → evidence/docs**.
- Preserve package lockfile unless dependency changes require updating it; review generated changes separately.
- After each commit, run the narrowest relevant tests. Before merging, run repository-level checks and a smoke path through the old Electron app.
- Stop after every gate and write a short agent report: *what changed, what stayed operational, proof, unresolved parity issues, next smallest safe ticket*.
- If repeated failures require cascading changes across many unrelated subsystems, stop and split work rather than attempting a destructive clean-slate rewrite.

## 8. Data and active-session handling: no accidental loss

### Stored data

- Back up data from a **quiescent or database-consistent snapshot**, not an arbitrary copy of an actively-written SQLite file.
- Never commit production profiles or secrets. Use synthetic/cleansed fixtures for CI.
- Migrations must be versioned, idempotent where feasible, and able to report validation failures without modifying the source.
- Maintain ownership distinction: global app data versus project-local `.lazify/` data.
- The new app may initially operate on a **copy** of the old profile; never have both versions write unsafely to the same profile.
- Compatibility must cover IDs, timestamps, ordering, foreign keys, document files, project moves, and unsupported/new fields.

### Long-running processes

- A UI component never owns the lifetime of an agent/PTY; a supervisor does.
- Run ID maps to exactly one authoritative process, with a documented multiplexing strategy for multiple viewers.
- Each subscription is disposable; UI reload reconnects using identity and backlog offsets where available.
- Never launch a replacement command automatically just because reattach fails; show a recoverable error and ask before re-running side effects.
- On full-app/OS crash, do not promise process survival unless the native supervisor has a proven independent lifetime; distinguish **live reattach**, **detected exit**, and **recover from durable logs**.

## 9. Testing evidence and parity gates

For each ticket, attach paths or CI links to: source baseline revision, fixture ID, contract test outputs, migrated-data validation, UI smoke results, negative/security tests, OS/architecture run results, and rollback rehearsal. Old-versus-new rows start `Not started` and only become `Pass` with evidence. Use the original roadmap's feature-by-feature and cross-cutting comparison tables without weakening them.

**Suggested minimum per ticket:**

- 1 happy path + 1 failure path + cancellation if supported.
- Boundary/schema validation and unauthorized request behaviour for native bridge methods.
- Events and subscription cleanup for stateful methods.
- Restart/reload and data compatibility for persistent or long-lived features.
- Full relevant OS matrix for native or platform-dependent capabilities.
- Regression smoke in existing Electron implementation.

## 10. Legacy-code retirement protocol — separate approval required

**Replacement implementation completed does not grant permission to delete the old code.** Retirement is a separately reviewed phase that can start only when **all** conditions hold:

1. Owner explicitly approved the new shell, shipped features, supported OS targets, and intentional differences.
2. Full relevant feature and cross-cutting parity rows are `Pass` or approved `Different by design` with no blockers.
3. Old baseline is archived/tagged, buildable, and recoverable with tested data restore steps.
4. Migration succeeded on representative profiles, and incompatible future-schema writes are documented.
5. New releases/updaters work, crash diagnostics are available, and rollback/forward recovery was rehearsed.
6. A **separate deletion PR** enumerates precise obsolete files and consumers and demonstrates no remaining imports, execution paths, tests, or product contracts require them.
7. A human reviews and approves the deletion PR. No agent may infer approval from passing tests alone.

**Delete narrow dead adapters only**, not entire directories based on name matching. Prefer keeping the legacy implementation for one or more validated releases when feasible. Never delete Git history or baseline branches as cleanup. If any gate fails, defer deletion and keep the fallback path.

## 11. Agent completion message format

```text
Ticket / branch / commits:
Baseline SHA and original Electron smoke result:
Capability and exactly what changed:
Files intentionally NOT changed or removed:
New tests + exact command/result:
Parity evidence and OS coverage (not tested explicitly listed):
Data touched / backup / migration result:
Security, events, process-lifecycle impact:
Feature-flag default and rollback path:
Open blockers, product decisions, human approvals:
Next smallest safe ticket:
```

## 12. First task to give a coding agent

> Read `framework-neutral-rewrite-roadmap.md` and this playbook. **Do not begin rebuilding or deleting files.** Inventory the repository's existing Electron baseline, `src/preload/api/` contracts and tests, persistent stores and process ownership. Create the `docs/rewrite/` documentation skeleton, fill `00-baseline.md` and the first-pass capability/contract/data inventories with real file references, and propose at most three small Phase-1 extraction tickets. Do not modify product behaviour or persistent data. Report pre-existing test failures and unknowns. Open a docs-only change set for review.

---

**Implementation note:** Any names, branch commands, target package paths, sample ticket scope, flag names, and sprint boundaries in this addendum are recommendations; verify them against the live repository before execution. The original roadmap's 2026-10-04 source map is a snapshot, not proof that later code has not changed.
