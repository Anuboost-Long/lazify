# 01 — Capability inventory and Chain gap map (first pass)

Rows follow the roadmap's "Product scope inventory". For each area, the
columns show:
- where it lives in the Electron app,
- which Chain SDK capabilities it can stand on today,
- what it still needs from Chain.

The Chain capability list is from `chain-sdk/docs/CAPABILITY_MATRIX.md` and
`chain-sdk/capabilities/*/contract.ts` as of 2026-10-09. Every Chain
capability is **experimental on macOS only**.

**Rule of thumb:** a Chain capability provides only a native primitive. Lazify
logic stays app-level TypeScript and runs in the webview. This includes the
scanners, Git output parsing, package-manager choice, `.env` editing, and the
attention and autopilot detectors. So the "Needs from Chain" column lists
primitives, never features.

| Area | Electron source | Preload groups | Chain today | Needs from Chain | Request |
| --- | --- | --- | --- | --- | --- |
| Home and navigation | `src/renderer/features/home`, `app/app-routes.ts` | — | `window`, `storage` | Nothing new. Settings move from Chromium `localStorage` to Chain storage (see `03-data-inventory.md` §4) | — |
| Projects and workspace | `src/main/projects/*`, `src/renderer/features/workspace` | `projects`, `system` (dialogs) | `files` (opaque references only, by design) | Choose a folder, then real-path tree, stat, read and write inside granted roots; dropped-file paths | 01 |
| Live project sync | `src/main/projects/project-importer-optimized.ts` | `projects` | — | File change events | 02 |
| Git | `src/main/projects/git-actions.ts`, `src/main/ipc/git.ts` | `git` | `processRunner` | Working directory and environment for spawned processes. Git parsing stays app-level | 03 |
| Scripts and terminal | `src/main/pty-runner.ts`, `src/main/command-runner.ts`, `src/main/ipc/scripts.ts` | `scripts`, `system.runCommand` | `processRunner` (one-shot, no PTY, no cwd) | Terminal sessions with backlog, reattach and group kill; working directory | 03, 04 |
| AI agents | `src/main/agents/*`, `src/main/main.ts` (attention, autopilot, keep-awake) | `agents` | `processRunner`, `storage` | Terminal sessions; read-only access to agent transcript folders (`~/.claude/projects`, `~/.codex/sessions`); notifications; keep-awake | 04, later |
| Agent live monitor | `src/renderer/features/agents` | `agents`, `scripts` | — | Same as above: one owner per run, many viewers | 04 |
| Tasks | `src/main/tasks/*` | `tasks` | `storage` | Importing the existing SQLite rows | later (data import) |
| Prompt Builder | `src/main/prompts/*` | `prompts` | `storage` | None. Rendering is pure and moves first (ticket 001) | — |
| Project creation | `src/main/scaffolding/*`, `templates/` | `workflow`, `templates` | `processRunner`, `http` | Working directory; writing a new folder tree (covered by 01 once the destination is granted) | 01, 03 |
| Imported templates | `src/brain/template-engine/*`, `src/main/scaffolding/imported-template-store.ts` | `templates` | `files` | Reading the source project tree (01) | 01 |
| Dependencies | `src/brain/package-version-matcher/*`, `src/main/projects/project-health.ts` | `packages` | `processRunner`, `http` | Working directory | 03 |
| Environment files | `src/main/projects/env/*` | `env` | — | Text read and write in granted roots | 01 |
| Developer environment | `src/main/environment/*` | `environment`, `system` | `processRunner` (already resolves the login-shell `PATH`) | Port list and process stop; open editor or terminal app. Installers run `zsh -l -c "<cmd>"` as argv, which needs no shell support in Chain | later |
| Formatting | `src/main/formatting/*` | `formatting` | `processRunner` | Working directory | 03 |
| Code quality and extensions | `src/main/linting/*`, `src/main/extensions/*` | `linting`, `extensions`, `code-intelligence` | `processRunner`, `http`, `models` | Long-lived language-server processes with streamed stdin (LSP), unpacking downloaded archives | later |
| Browser and preview | `src/main/browser/*`, `src/main/media/*` | `browser`, `media` | `browser` (a **separate** window) | Embedded guest view in the main window, popup policy, blocking, PiP. Needs product decision D-3 first | later |
| API Studio | `src/main/api-studio/*` | `apiStudio` | `http` (no cookies, no streaming, whole bodies) | Keychain for secrets; TLS exceptions and timing in `http`; project-local `.lazify/` files (01) | later |
| API documentation | `src/main/api-studio/docs/*` | `apiDocs` | `pdf`, `files` | File change events on `.lazify/api-studio/docs` (02) | 02 |
| DMG compiler | `src/main/dmg/*`, `src/main/dmg-compiler.ts` | `dmg` | `processRunner` | Working directory (03). The `hdiutil` usage stays app-level, macOS only. Styling the image scripts Finder, which needs the Apple Events entitlement and usage string (`build/entitlements.mac.plist`, `electron-builder.mac.yml`) in Chain's bundle config | 03 |
| App and UI settings | `src/renderer/shared/hooks/*`, `src/main/window-zoom.ts` | `system` (zoom) | `window`, `storage` | Webview zoom | later |
| Distribution and reliability | `src/main/updater.ts`, `src/main/diagnostics/*`, `src/main/splash.ts`, `src/main/app-menu.ts` | `updater`, `system` | `window` (show when ready) | Updater, app menu, crash and log paths | later |
| Marketing site | `website/` | — | — | Out of scope | — |

## Request order

The order follows the roadmap's Phase 4 slice: open a project, run a command,
give an agent a task, reload, reconnect. Requests 01–04 are drafted in
`../chain-sdk-requests/`. Everything marked "later" gets a request only when
its slice is next (Chain rule 7: capabilities are added for real needs only).
