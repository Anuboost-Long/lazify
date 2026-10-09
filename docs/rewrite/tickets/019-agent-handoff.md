# 019 — Give an agent a task, autopilot, sessions and usage (Phase 4 / In progress)

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
- [ ] In the app: past sessions and usage. The new read-only entries
      (`~/.claude/projects`, `~/.codex/sessions`, `~/.claude.json`,
      `~/.codex/auth.json`) take effect when `chain dev` restarts. The two
      single files are covered by
      [Chain request 10](../../chain-sdk-requests/10-declared-read-only-files.md)

## Carried over from Electron

- A half-written last transcript line is read once, fails to parse, and
  is never re-read, because the cache offset moves to the end of the
  file. Its tokens are lost from the totals. The golden fixture keeps
  this.
- On macOS, `~/.claude/.credentials.json` is only a fallback after the
  Keychain. It isn't declared, so on macOS the port behaves the same.

## Not removed

Nothing. Nothing in the Electron repo was changed.
