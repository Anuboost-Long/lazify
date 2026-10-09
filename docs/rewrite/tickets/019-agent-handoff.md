# 019 — Give an agent a task, autopilot, sessions and usage (Phase 4 / Done)

**Read this whole ticket before touching code.** The Prompt Builder's
storage and the task → agent handoff run on Chain, so a task can be sent to
an agent from the ported screens.

## Status — 2026-10-09

- `src/features/prompts/lib/`: Electron's `preset-store.ts`,
  `context-store.ts`, `builtin-context.ts` and `prompt-builder.ts`, made
  async over Chain storage (`database()`). Same tables, ids and seeding.
- `src/platform/prompts.ts`: seeds the built-in presets and context once
  (`ready()`) before any read, as Electron's main process did at startup,
  and puts the 12 `prompts` members on the bridge.
- `src/shared/lib/tasks/task-prompt.ts`: `buildTaskPrompt`, Electron's
  task → prompt step, now on the bridge through `src/platform/tasks.ts`.

## How the handoff works

As in Electron's `SendTaskModal`: `buildTaskPrompt` → `pasteIntoTerminal`
→ Enter → `recordTaskRun`. The paste waits in a queue until the agent's
terminal view is mounted and registers itself, so the prompt lands when
the pane appears, not before.

## Acceptance checklist and evidence

- [x] Electron's prompt tests pass on Chain storage
      (`tests/features/prompts/`, 52 tests), and Electron's task tests
      pass in full (21 of 21, including prompt building)
- [x] `CI=true npm test` passes (345 tests); typecheck passes
- [x] Real app, with `chain inspect`: a custom agent reading lines
      (`while read …; printf "GOT:%s"`) was opened on lazify-chain, a
      task's prompt was built and pasted, and once a terminal view
      registered, the agent printed `GOT:first line` and `GOT:second
      line`. The run was recorded as `sent`, and the task moved to
      `doing` (`auto`). The agent, the custom agent and the task were
      removed afterwards
- [x] Phase 4 exit run in the real app, through its own buttons with
      `chain inspect`:
      - **Sync project** (picker stubbed to this repository) synced
        lazify-chain
      - on the Agents page, **New agent** → **Echo check** (a custom
        agent) started an agent run in lazify-chain
      - Tasks → **Add task** → "Echo exit check" → **Save**: the editor's
        preview showed the prompt built from the Chain-stored presets and
        rules
      - the row's **Send this task's prompt to the agent** → the echo
        agent: the agent printed the prompt, the task moved to `doing`,
        and one run was recorded against that agent
      - `location.reload()`: the agent was still running, its tab came
        back, and the task kept its status and run
      - everything was removed afterwards
- [x] The reattached agent terminal repainting its output. On
      2026-10-09, with the window visible, a custom agent printing 40 lines
      and then waiting (`cat`) was started from **New agent**. After
      `location.reload()` its tab came back and all 40 lines were drawn
      again in the terminal's rows. The agent was stopped and removed
      afterwards
- [x] Autopilot (019b): `src/platform/autopilot.ts` keeps Electron's
      `agent-autopilot.json`. `src/platform/agents.ts` routes a waiting
      agent to Electron's unchanged `Autopilot` before raising attention,
      as Electron's main process did. Tests: switches stored in Electron's
      format; a prompt answered (`1` typed, `onAutopilotAnswered` fired) in
      a project where autopilot is on, and handed to the user in an
      excluded one
- [x] Past sessions (019c): `agent-sessions.ts` reads transcripts through
      `desktop.folders` in chunks instead of Node streams. Golden fixture
      recorded from Electron (`docs/rewrite/scripts/agent-sessions-recorder`):
      5 of 5 cases match, including a first record over 64 KB, a
      multi-byte character split across a chunk, CRLF, boilerplate,
      sidechains, both Codex formats and the folder-depth limit
- [x] Usage and budgets (019c): `agent-usage.ts`, `usage/*`,
      `rate-limit.ts`, both account APIs, `agent-limits-store.ts` and the
      activity watcher (on `desktop.folders.watch`). The account calls go
      through `desktop.http` (`src/platform/http.ts`), and the Keychain
      token through `security` as before. Golden fixture recorded from
      Electron (`docs/rewrite/scripts/agent-usage-recorder`), with the
      network and Keychain faked and only fixture tokens accepted: 4 of 4
      cases match, including the re-read of an appended transcript.
      Electron's `codex-rate-limit` tests pass on the copy
- [x] In the app: past sessions and usage, after a `chain dev` restart
      on 2026-10-09. **New agent** → **Resume a session** listed the
      lazify project's real Claude conversations, and the Agents page's
      **Usage** panel showed Claude's and Codex's totals, 5-hour windows
      and the limits their accounts reported (Claude through the Keychain
      token, Codex through `~/.codex/auth.json`, declared by
      [Chain request 10](../../chain-sdk-requests/10-declared-read-only-files.md))

## Testing note: probe agents

The echo agent above is a shell `read` loop, which reads one line at a
time. It lost 8 of a prompt's 37 lines even when the prompt arrived in one
write: macOS keeps only about 1 KB of unread line-by-line input, and the
loop drains it slowly. An agent reading raw input
(`stty -icanon -echo; cat`) got all 37, and so did plain `cat`. Real agent
CLIs read raw input. Electron's node-pty goes through the same macOS
terminal driver. The modal pastes without pressing Enter, as in Electron,
so the prompt's last line waits for the user to submit it.

## Carried over from Electron

- A half-written last transcript line is read once, fails to parse, and
  is never re-read, because the cache offset moves to the end of the
  file. Its tokens are lost from the totals. The golden fixture keeps
  this.
- On macOS, `~/.claude/.credentials.json` is only a fallback after the
  Keychain. It isn't declared, so on macOS the port behaves the same.

## Not removed

Nothing. Nothing in the Electron repo was changed.
