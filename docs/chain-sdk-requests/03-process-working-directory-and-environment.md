# Capability Request 03 — Run a process in a chosen folder, with extra environment variables

Source: the Lazify rewrite to Chain (`docs/rewrite/01-capability-inventory.md`).
The rows are Git, Dependencies, Project creation, Formatting, DMG compiler and
Developer environment. Extends capability 10 (`process-runner`).

**Not part of this request:**
- Interactive terminals. A PTY with resize, backlog and reattach is request 04.
- Long-lived language-server processes that need a two-way stdio protocol.
  Lazify has them (`src/main/linting/engines/lsp/session.ts`), but they come
  in a later slice with its own request.

## Why this is an extension, not a new capability

`process-runner` already has the right shape for Lazify's one-shot commands:
argv only, streamed output, `exited`, `kill()`, and the login-shell `PATH`
lookup. Its CONTRACT.md non-goals leave the door open on purpose:

> **No environment-variable or working-directory options (yet).** […] Add
> this only when a real need shows up, not speculatively.

This request is that need. Two related non-goals also block Lazify. Each is
explained below with the code that depends on it.

## What Lazify actually does with this today (Electron, verified in source)

About 50 files under `src/main` spawn processes. 15 set `cwd`, and every one
of those is a project folder:
- Git: `projects/git-actions.ts`, `project-git-status.ts`
- package health: `project-health.ts`
- scaffolding: `scaffolding/workflow/*`, `imported-template-store.ts`
- agent change tracking: `agents/agent-changes.ts`
- the linter's file scan: `linting/scan/source-files.ts`

Running `git status` or `npm install` anywhere other than the project folder
is simply wrong. Changing into the folder with a shell `cd` is ruled out by
this capability's no-shell invariant, correctly.

Environment variables Lazify adds today:
- `PORT=<free port>` when a dev script's port is taken
  (`src/main/environment/dev-port.ts`).
- `LAZIFY_LINT`, `LAZIFY_LINT_SOCKET`, `LAZIFY_LINT_PROJECT` and
  `LAZIFY_LINT_GUIDE` for agent sessions, so an agent can call Lazify's
  linter (`src/main/agents/session-lint.ts`).
- Command-specific variables merged over the inherited environment
  (`src/main/command-runner.ts`, `CommandRequest.env`).

## What Lazify needs

1. **Working directory.** An optional `cwd` (absolute path). Validate it
   natively: it must exist and be a directory. If request 01 lands with
   grants, it must also be inside a granted root. Otherwise reject with a
   normalised error before spawning.
2. **Extra environment.** An optional `env` map, merged **over** the
   inherited environment, which includes the login-shell `PATH` this
   capability already resolves. Replacing the whole environment is not
   needed.
3. **Writing to stdin while the process runs.** Today `options.stdin` is
   one-shot. Lazify answers prompts that appear mid-run:
   `src/main/command-runner.ts` (`detectCommandChoicePrompt`) spots
   `Overwrite? (y/N)` or a numbered menu in a scaffolding CLI's output. It
   shows the choice in the UI (`InitProjectProgressRoute.tsx`), then writes
   `y\n` or `2\n` into the still-running process's stdin. That needs a
   `write()` on the handle, plus a way to close stdin. The non-goal says
   *"If a real need for an interactive/long-lived process with stdin shows
   up later, that's a different, future capability decision"*. Lazify asks
   Chain to make that decision now: either here, or folded into request 04.
   A scaffolding CLI that asks a question would work in a PTY too.
4. **Stopping the whole process tree.** `npm run dev`, `dotnet watch` and
   `npx create-*` are wrappers whose children do the real work. Killing only
   the wrapper leaves the child holding the dev port, so the next start fails
   with "address already in use". `src/main/pty-runner.ts` (`signalGroup`,
   `killAndWait`) signals the process group, escalates from SIGTERM to
   SIGKILL after 2 s, and gives up after 5 s. Lazify needs the same guarantee
   from `kill()`, or an explicit tree-kill option. Today's non-goal says the
   opposite ("No process groups").

## Native module survey — macOS vs Windows

### macOS
- `cwd` and `env`: `std::process::Command::current_dir` and `.envs`. No risk.
- Tree kill: spawn the child in its own process group (`setpgid` through
  `pre_exec`, or `process_group(0)`), then `killpg`. This is the same
  approach node-pty takes and the Electron app relies on.

### Windows (not verified)
- `cwd` and `env`: same `std::process::Command` API.
- Tree kill: there are no process groups in the POSIX sense. Use a **Job
  Object** with `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`, or
  `taskkill /T /F /PID`.
- **Still open from capability 10:** `.cmd` and `.bat` shims for npm-installed
  CLIs. `research/WINDOWS.md` lists three candidate fixes, and
  `crates/core/src/process_runner.rs` uses none of them yet. Lazify spawns
  `npm`, `yarn`, `pnpm` and `npx` constantly, so on Windows nothing in
  Lazify works until that is decided. The Electron code routes through
  `cmd.exe /c` (`pty-runner.ts`, `resolveSpawnTarget`) and `shell: true` on
  `win32` (`command-runner.ts`).

### Shared
These are additive options on an existing capability. Callers that pass none
of them behave exactly as today.

## Suggested next step for chain-sdk

Update `agent-docs/capabilities/process-runner/CONTRACT.md`:
- add `cwd` and `env` to `ProcessRunOptions`,
- decide on stdin `write()` here vs request 04,
- replace the "no process groups" non-goal with a defined tree-kill
  guarantee per OS.

Keep "no shell interpretation" exactly as it is. Lazify's environment pane
runs install commands through `zsh -l -c "<command>"`
(`src/main/environment/login-shell.ts`). That is an ordinary argv spawn of
`zsh`, so the app takes responsibility for it, and it needs nothing from
Chain's invariant.
