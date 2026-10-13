# Capability Request 15 — Launch a program that outlives the app

Source: the Lazify rewrite to Chain, ticket 027 (developer environment,
"open in editor"), 2026-10-14.

**Not part of this request:**
- Output, stdin, exit codes or a handle for the launched program. Lazify
  only needs to know whether it started.
- Opening a file with the OS's default app. Lazify does that with
  `open <file>` through `process-runner`, as it already does for links.
- Anything Windows-specific beyond what the same call would do there.

## Why this needs a change in Chain

Lazify opens a source file in the user's editor: a click on a file link
in an agent's output, or "Open in editor" in the file tree. The editor
is whatever command the user set, with `{folder}`, `{file}` and
`{line}` filled in, for example:

- `code {folder} -g {file}:{line}` (VS Code, Cursor, Windsurf)
- `"/Applications/IntelliJ IDEA.app/Contents/MacOS/idea" {folder} --line {line} {file}`
  (WebStorm, IntelliJ, Rider, PyCharm, PhpStorm)
- `"/Applications/Zed.app/Contents/MacOS/cli" {folder} {file}:{line}`

Electron Lazify spawns it detached (`src/main/environment/open-in-editor.ts`):

```ts
const child = spawn(invocation.program, invocation.args, { detached: true, stdio: "ignore" });
child.unref();
```

so the editor is not Lazify's to stop: quitting Lazify leaves it open.

On Chain the only way to start a program is `process-runner`, whose
contract says: "Every process still running when the app quits normally
is killed with its tree (SIGKILL, no grace period)." That is right for
scripts and builds. For an editor it is not:

- The JetBrains launchers above *are* the IDE process. Opened from
  Lazify, the IDE is killed with SIGKILL when Lazify quits, with no
  chance to save.
- `code` and `cursor` hand off to an already running editor and exit,
  so they are safe today only by accident of how they're built.

A shell wrapper (`sh -c '"$0" "$@" &'`) doesn't help: the background job
stays in the same process group, which is what Chain kills.

## What Lazify needs

- Start a program with arguments (argv, never a shell string, the same
  rule as `process-runner`) so that it is **not** stopped when the app
  quits, by any path: normal quit, app crash, `chain dev` restart.
- Resolve once it has started, or reject when it can't be started
  (`NOT_FOUND` for no such program, as `process-runner` does), so
  Lazify can say "VS Code isn't installed" instead of nothing.
- The program found on the user's login-shell `PATH`, the same as
  `process-runner`, so `code` resolves for a Finder-launched app.
- No output and no handle needed.

## How Lazify will use it

`openInEditor` in `src/shared/lib/environment/open-in-editor.ts` runs
one or two launches (the folder first, then the file, 400 ms apart) and
reports the first failure. Until this exists it uses `process-runner`,
which works while Lazify is running; ticket 027 lists the quit case as
open.
