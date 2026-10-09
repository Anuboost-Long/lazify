# 019 — Give an agent a task (Phase 4 / In progress)

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
- [x] `CI=true npm test` passes (324 tests); typecheck passes
- [x] Real app, with `chain inspect`: a custom agent reading lines
      (`while read …; printf "GOT:%s"`) was opened on lazify-chain, a
      task's prompt was built and pasted, and once a terminal view
      registered, the agent printed `GOT:first line` and `GOT:second
      line`. The run was recorded as `sent`, and the task moved to
      `doing` (`auto`). The agent, the custom agent and the task were
      removed afterwards
- [ ] Autopilot settings (019b)
- [ ] Agent sessions and usage (019c): needs `~/.claude/projects` and
      `~/.codex/sessions` readable

## Not removed

Nothing. Nothing in the Electron repo was changed.
