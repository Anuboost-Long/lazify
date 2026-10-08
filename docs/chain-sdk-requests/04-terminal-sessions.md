# Capability Request 04 — Interactive terminal sessions that outlive a page reload

Source: the Lazify rewrite to Chain (`docs/rewrite/01-capability-inventory.md`).
The rows are Scripts and terminal, AI agents and Agent live monitor. The
roadmap's Phase 4 exit ("run a command, give an agent a task, reload,
reconnect") cannot pass without it. Playbook Sprint E calls it the highest
risk item in the rewrite.

**Not part of this request:**
- One-shot commands (`process-runner` plus request 03).
- Deciding what output means. Lazify's attention detection, autopilot
  answers, choice-prompt detection and agent usage all stay app-level and
  parse the output stream themselves.
- Keeping sessions alive after the **app** quits. Today's Electron app does
  not do that either.

## Why this needs a new capability

`process-runner`'s non-goals rule this out on purpose:

> **No interactive stdin, no persistent/interactive process, no PTY.** […]
> that's a different, future capability decision

Lazify's main surfaces are interactive programs in a real terminal: dev
servers with coloured, redrawing output, and AI agent CLIs (Claude Code,
Codex, Gemini and custom agents) that use full-screen TUIs, read keystrokes
and resize with the window. That needs a pseudo-terminal: a TTY on the child
side, window size, raw input. Mneme deliberately avoided needing a PTY by
running agents headless (request 10). Lazify cannot do that, because the
terminal **is** the product.

## What Lazify actually does with this today (Electron, verified in source)

`src/main/pty-runner.ts` (`PtyRunner`, built on `node-pty`) lives in the
Electron main process. A renderer reload does not touch it.

| Behaviour | Current implementation |
| --- | --- |
| Start | `start(command, args, cwd, label, cols = 220, rows = 50, extraEnv)`: `xterm-256color`, environment merged over `process.env`, returns `runId` (`pty-<ms>-<hex>`) |
| Output | Chunk events `{ runId, data, seq }`. `seq` increases per session |
| Backlog | The last ~512 KB per session, trimmed **in whole chunks** so escape sequences stay intact. `getBacklog(runId)` returns `{ data, seq }` |
| Reattach | After a reload the renderer calls `listSessions`, then for each run `ptyBacklog(runId)`. It replays the backlog and drops live chunks whose `seq` it has already seen (`src/renderer/shared/terminal/terminal-pool.ts`) |
| Input and resize | `write(runId, data)` and `resize(runId, cols, rows)`, fire-and-forget |
| Status | `running` at start; `done` (exit 0) or `error` with `exitCode` at exit |
| Stop | Signals the **process group** (see request 03 item 4). `killAndWait` escalates and is used by restart, so the old server releases its port first |
| Background observers | `observe(listener)`. `src/main/main.ts` feeds every chunk to `AttentionDetector` (agent waiting or done), autopilot and `AwakeGuard` (keep-awake while busy), **whether or not any screen is showing that run** |
| Callers | Scripts (`src/main/ipc/scripts.ts`), agent sessions (`src/main/ipc/agents.ts`, `openAgentTerminal`, including resume and hidden runs), and the monitor wall (`src/renderer/features/agents/`) |

## What Lazify needs

The contract shape is Chain's decision. At minimum:

1. **Sessions owned by Chain Core, not the page.** A session must keep
   running, and keep buffering output, while the webview reloads or
   navigates. This is the property the whole request exists for.
2. **Start** with:
   - command and argv (no shell, same rule as `process-runner`),
   - `cwd`,
   - extra environment,
   - initial columns and rows,
   - `TERM=xterm-256color`.

   It returns a session id that is unique for the app's lifetime and never
   reused.
3. **Output as an ordered stream with sequence numbers.** Chunks are UTF-8
   decoded **statefully**, so a multi-byte character split across reads is
   never corrupted. Batching chunks within a frame is welcome; agent TUIs and
   `npm install` produce output in bursts.
4. **Backlog with an offset.** "Give me the retained output and the sequence
   number it ends at" allows a gap-free reattach. The retention size should be
   a start option or documented (Lazify uses about 512 KB). Trim at chunk
   boundaries.
5. **Several listeners on one session.** The workspace pane and the monitor
   wall can show the same run, and the app's own detectors listen too. Each
   subscription can be stopped on its own. Chain should never start a second
   process for a second viewer.
6. **List live sessions** with id, label, cwd, pid and start time. This is how
   the page finds its sessions again after a reload. An app-supplied label or
   metadata field would let Lazify store the project and agent identity
   without a side table.
7. **Write** (keystrokes and paste, including bracketed-paste sequences the
   app sends) and **resize**. Both should report "session not found" rather
   than silently doing nothing; today's Electron calls are fire-and-forget,
   and their failures go unnoticed.
8. **Exit event** with the exit code, and whether the session was killed.
9. **Kill the process tree**, with an awaitable form that escalates and then
   gives up after a timeout (request 03 item 4, same semantics).

### What moves from Lazify's main process into the page

Today, attention detection, autopilot and keep-awake run in the Node main
process. In the Chain app they run in the webview. After a reload they must
rebuild their state from the backlog (item 4) before processing live chunks.
Lazify owns that logic. Chain only has to guarantee that **no output is lost
while no listener is attached.**

## Native module survey — macOS vs Windows

### macOS
`openpty` / `forkpty`, the same mechanism node-pty uses. The child gets its
own session and process group (`setsid`), which is also what makes tree kill
work. Resize is `TIOCSWINSZ` plus `SIGWINCH`.

### Windows (not verified)
ConPTY (`CreatePseudoConsole`, Windows 10 1809 and later), which node-pty also
uses. Known differences:
- ConPTY rewrites and re-renders output (it emits its own escape sequences),
  so byte-for-byte parity with macOS output is not a realistic goal. Visual
  parity is.
- npm-installed CLIs are `.cmd` shims. The Electron app wraps them as
  `cmd.exe /c <command>` (`pty-runner.ts`, `resolveSpawnTarget`), because
  `CreateProcess` ignores `PATHEXT`. This is the same open question as
  capability 10's Windows research.
- Tree kill through a Job Object (see request 03).

### Shared
The Rust crate `portable-pty` (from the WezTerm project) wraps both. The rest
is Rust work in Chain Core: session registry, ring buffer, sequence counter,
fan-out to listeners. No Swift or .NET code is expected.

## Suggested next step for chain-sdk

Draft `capabilities/<name>/CONTRACT.md` and `contract.ts` (maybe
"terminal-sessions"). Non-goals to write down:
- no terminal emulation or rendering (Lazify uses xterm.js in the page),
- no output parsing,
- no persistence across app restarts,
- no shell strings.

Settle request 03's stdin question at the same time. If interactive stdin
lives only here, request 03 shrinks to `cwd`, `env` and tree kill.
