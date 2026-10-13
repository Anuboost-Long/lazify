# 027 — Developer environment (Phase 5 / In progress: app checks left)

**Read this whole ticket before touching code.** The Environment pane's
tool scan, installs, updates and uninstalls, nvm, the listening-ports
list and its Stop, and opening a file in the user's editor, on Chain:
the twelve `environment` members after `checkEnvironment` and the two
editor members, all still stubbed since ticket 015.

## Goal

- **Tools:** the same 19 tools in the same order, each probed the same
  way (nvm-scoped for Node tools and the agent CLIs), with the same
  install, update and uninstall commands per platform, the same update
  checks (npm within the installed major, Homebrew, GitHub for nvm,
  rustup), the same 30 s scan cache and in-flight sharing.
- **nvm:** list versions with LTS names and the current one, set the
  default, switch the version for the rest of the session, install nvm.
- **Ports:** every listening process with its command line, Lazify's own
  marked protected and the dev server's port left out, scripts Lazify
  started marked managed; Stop ends the process and its children, SIGTERM
  then SIGKILL after 1.5 s, refusing Lazify's own.
- **Editors:** detect the 11 editors from PATH or their shipped
  launchers; open a file in the chosen editor (folder first, then the file
  at its line), or in the default app when none is set.

## Status — 2026-10-14

Built. Electron's 34 tests pass on the copy. In the running app: the
forced scan (19 tools, ~1 s) and the cached one, probes, the npm update
check, nvm's version list and editor detection. Opening an editor uses
request 15 (`processRunner.launch`), sent and shipped the same day. Left:
`nvmUse` changing a later spawn's Node, and Stop on listening processes,
in the app. A first run was cut short when another session stopped
`chain dev`; a second ran but its results were lost when the inspector
moved.

## Source-of-truth references

- Roadmap row: Phase 5 "developer environment"
- Old source: `src/main/environment/{environment-scanner,tool-scan,tool-actions,nvm-manager,login-shell,port-reaper,open-in-editor,editor-catalog}.ts`,
  `src/main/environment/tools/*`, `src/main/ipc/{environment,system}.ts`
- Public API: `environment.*` (12 after `checkEnvironment`) and
  `detectEditors`, `openInEditor` in
  [`../02-contract-manifest.md`](../02-contract-manifest.md)
- Old tests: `tests/main/environment/{tools,update-checks,login-shell}.test.ts`,
  `tests/main/{editor-catalog,open-in-editor}.test.ts` (34)
- Persistent data touched: none. The editor command is the renderer's
  setting
- Required OS behaviour: a login shell (`zsh`), `curl`, `brew`, `npm`,
  `lsof`/`ps` (already used by ticket 005), `kill`, `open`

## Current observable behaviour (Electron)

Recorded in the old tests above, and in the source: every action returns
`{ success, output }` with the shell's own words, never throws; probes
never throw; an unknown tool answers "No install method available…" /
"cannot check"; Stop answers "Refusing to signal that process." for a
pid ≤ 1, "That process belongs to Lazify." for its own, "Stopped." or
"Force stopped.".

## Target boundary

- Copied to `src/shared/lib/environment/` (replacing the type-only
  stand-ins), with these changes:
  - `process.platform`, `existsSync`, `homedir()` and `process.env` are
    read from a small `host.ts`, filled before each entry point: the OS
    from `desktop.platform`, `HOME`/`NVM_DIR`/`COMSPEC` from the user's
    environment, and the files the tools check (nvm scripts, Linux
    package managers) in one batched `test -f`. The tool modules keep
    their synchronous shape.
  - Commands run through `@/platform/exec` (`process-runner`), which
    already uses the user's login-shell PATH. Electron's
    `normalizeRuntimePath` is not ported for probes.
  - `nvmUse`'s new PATH becomes the **session PATH** in
    `src/platform/exec.ts`, added to every later spawn (`execFile`, the
    command runner, terminals) unless the caller sets its own, as
    Electron's `process.env.PATH = …` did.
  - Port reaper: Lazify's own pid is the parent of a child it spawns
    (`sh -c 'echo $PPID'`); the dev server's port is the window's own
    `location.port` in a dev build; managed pids are the terminal
    sessions'; signals go through `kill`.
  - Editors: PATH folders from the login-shell `PATH`; the existence
    checks batched into one `test -f` run (`detectEditors` is asked once
    to list every place it would look); the editor started with
    `processRunner.launch` ([request 15](../../chain-sdk-requests/15-launch-an-app-that-outlives-lazify.md)),
    so it outlives Lazify as Electron's detached spawn did; the
    default-app fallback is `open <file>`, as `openExternalUrl` and
    `revealInFileManager` already do.
- Bridge: the 14 members move from their stubs to `src/platform/environment.ts`.

## Acceptance checklist and evidence

- [x] Electron's 34 tests pass on the copy (`tests/shared/lib/environment/`)
- [x] In the app (`chain dev`, `chain inspect`): forced scan in 988 ms
      with every tool's real version, cached scan in 0 ms, `probeTool`
      for git and an unknown name, `checkToolUpdate("npm")` (10.9.9
      within major 10), unknown install refused with Electron's message,
      four nvm versions with LTS names and the current one, editors
      found (VS Code on PATH, Windsurf's shipped launcher) in 15 ms
- [ ] In the app: `nvmUse` and a later spawn on that Node; listening
      processes with Lazify's own protected and the dev server absent;
      Stop on an external, a managed and an app-owned server
- [ ] An editor opened from Lazify still open after Lazify quits
- [x] `CI=true npm test` (542 passed, 9 skipped), `npm run typecheck`,
      `npm run build:web` pass
- [ ] Windows (D-2)

## Differences from Electron

- **Probes** use the login-shell PATH Chain resolves, not Electron's
  `normalizeRuntimePath()`, which also appended fixed folders
  (Homebrew, `~/.local/bin`, `~/.cargo/bin`, Bun, .NET). A tool only in
  one of those folders and not on the user's shell PATH shows as
  missing here.
- **Lazify's own pid** is the parent of a process it spawns; Electron
  used `process.pid`.
- **A launched editor doesn't get the `nvmUse` PATH** (`launch` takes no
  environment). The editors in the catalog are native launchers.

## Not removed

Nothing. Nothing in the Electron repo is changed.

## Rollback

Revert the commit; the members go back to their stubs.

## Open questions

None yet.

## Verification log

- 2026-10-14, macOS 27.0.1 arm64: Electron's tests on the copy; the app
  run above. During the first app run the chain-sdk session sent SIGTERM
  to this app's `chain dev` by mistake (its own report), which ended the
  app at 01:36:17; it was not the Stop under test.
