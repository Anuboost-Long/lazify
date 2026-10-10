# 023 — Git screens, and task and prompt history (Phase 5 / Done)

**Read this whole ticket before touching code.** The Git screens, and
the task and prompt history, checked against Electron. The platform side
is ticket 007, and project health (outdated and audit) shipped in ticket 022.

## Goal

Close the roadmap's Git row and its "Agents, prompts and tasks" checks
with evidence rather than an assumption carried over from earlier tickets:

- Git status, diff and actions give errors you can act on, and never
  discard or stage files without a clear choice by the user.
- The Git screens behave as in Electron: Workspace's Git pane (stage,
  unstage, discard with confirmation, commit, pull and push), the branch
  switcher, Home's Git summary, the synced tree's change marks, and the
  Agents page's changes and diff modal.
- Task history keeps each status change's source and the exact prompt
  that was sent, after an agent run ends. Prompt Builder stays offline and
  deterministic.

## Status — 2026-10-10

Done on macOS. Both unported Electron tests pass on the copy, and every
Git action, the discard confirmation, Home's Git summary and task history
were checked in the running app. Left: the synced tree's change marks and
the Agents diff modal in the app.

- The screens are copied from Electron's renderer. Apart from ticket 015's
  Tailwind 4 class renames (`outline-hidden`, `wrap-break-word`,
  `bg-accent/6`, the trailing `!`), they are identical:
  `GitStatusPane`, `git-status/*`, `BranchSwitcher`, `AgentDiffModal`,
  `use-git-summary`, `use-agent-branch`, `use-agent-changes`.
- Two Electron tests touching these had not been ported:
  `tests/main/projects/git-pull.test.ts` and
  `tests/renderer/git-status-visual.test.ts`.
- Task runs and status events already pass Electron's tests on Chain
  storage (ticket 016, `tests/shared/lib/tasks/tasks.test.ts`: "the record
  of what an agent was given", "the trail a task leaves", "what handing a
  task to an agent does to it"). Prompt assembly is pinned by ticket 001's
  16 golden cases.

## Source-of-truth references

- Roadmap rows: comparison checklist "Git"; Phase 5 "Git, project
  health"; "Port Prompt Builder and task lifecycle … run/status history";
  checks "Git status/diff/actions return actionable errors …" and
  "Task history retains task status source and exact sent prompt …"
- Old source: `src/renderer/features/workspace/components/{GitStatusPane,BranchSwitcher}.tsx`,
  `…/git-status/*`, `src/renderer/features/agents/{components/AgentDiffModal.tsx,hooks/use-agent-*.ts}`,
  `src/renderer/features/home/desktop/widgets/use-git-summary.ts`,
  `src/main/projects/git-actions.ts`, `src/main/tasks/*`
- Public API: `git` and `tasks` in [`../02-contract-manifest.md`](../02-contract-manifest.md)
- Old tests: `tests/main/projects/git-pull.test.ts`,
  `tests/renderer/git-status-visual.test.ts`, `tests/main/tasks.test.ts`
  (already ported); ticket 007's golden fixture
- Persistent data touched: the project's Git repository (index, commits,
  branches) through `git`; `tasks`, `task_agent_runs` and
  `task_status_events` in Chain storage

## Target boundary

Nothing new on Chain. The Electron tests are copied with their imports
changed: `node:child_process` becomes `@/platform/exec`, which is what
`git-actions.ts` calls on Chain.

## Acceptance checklist and evidence

- [x] `git-pull.test.ts` passes on the copy
      (`tests/shared/lib/git/git-pull.test.ts`): `--no-edit`, the
      unpublished-branch retry against `origin`, and git's own message on
      any other failure. Dropping `--no-edit` from `pullCurrentBranch`
      failed all three, then was reverted
- [x] `git-status-visual.test.ts` passes on the copy
      (`tests/features/workspace/git-status-visual.test.ts`)
- [x] Every `git` member through `globalThis.lazify` in the app, on a
      scratch repository in the app's temp folder: status, line counts and
      the diff; a missing branch and an empty commit message give their
      messages; stage, unstage, commit and discard change the status as
      expected; push and pull with no remote return git's own instructions
- [x] The Workspace Git pane on that repository: discard opens "Discard
      changes? Local edits to a.txt will be lost. This cannot be undone.";
      Cancel left the file on disk; confirming removed only the chosen
      file. Stage moved the file under "Staged Changes" (`M  a.txt` in
      git), "Commit (1)" committed the typed message and cleared the box,
      Push from the commit menu showed git's message in the pane, and the
      branch switcher moved HEAD from `other` to `main`
- [x] Home's Git widget showed `main` and "2 changed files" for two
      changes in the repository
- [x] Task history in the app: a task given a run (as the send flow
      records it), whose agent then finished, kept the run as done with
      the exact prompt (1,438 characters, equal to `buildTaskPrompt`) after
      a reload; closing the agent's runs a second time closed nothing; the
      trail read `doing/auto`, then `done/manual`. The task's detail shows
      the run ("Claude Code · 10/10/2026 18:14", Copy). Status events are
      stored but not shown, in Electron as well
- [x] `CI=true npm test` (400 passed, 9 skipped) and `npm run typecheck`
      pass
- [ ] Left: the synced tree's change marks and the Agents page's diff
      modal were not checked in the app (their data, `getProjectGitStatus`
      and `getWorkingChanges`, was, here and in ticket 007)
- [ ] Windows (D-2)

## Not removed

Nothing. Nothing in the Electron repo is changed.

## Rollback

Revert the commit; only tests and this ticket are added.

## Open questions

None yet.

## Verification log

- 2026-10-10, macOS arm64, `chain dev`, driven with `chain inspect`. The
  scratch repository was synced by writing the same entry the sync flow
  writes (no picker), and the project list, active project and Home
  widgets were restored byte for byte afterwards. The scratch task, its
  run and its events were deleted (`deleteTask` left none), and the
  repository removed.
