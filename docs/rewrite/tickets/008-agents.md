# 008 — Agents: launch, attention, reattach (Phase 2 / Done)

**Read this whole ticket before touching code.** Done on 2026-10-09: agent CLIs
run in Chain terminal sessions, the "waiting for you" and "turn done"
detection runs as in Electron, and a waiting agent is found again after a
page reload. This completes Phase 2's exit criterion together with ticket
004.

## Goal

Rebuild the part of the Electron app's `agents` group that runs an agent:
the agent list (built-in and custom), launching and resuming an agent in a
terminal, hidden runs, and the attention detector that tells the UI when an
agent waits for an answer or finishes its turn.

## Status — 2026-10-09

- `src/platform/agents.ts`: `listAgents`, `addCustomAgent`,
  `removeCustomAgent`, `openAgentTerminal`, `onAgentAttention`,
  `onAgentDone`, plus `isAgentRun`, `isHiddenRun`, `isWaiting` and
  `clearAttentionOnSubmit`, which the `scripts` group uses.
- `src/platform/scripts.ts` now fills `waiting` and `isAgent`, keeps hidden
  runs out of `listSessions`, and clears an agent's waiting state when Enter
  is typed (`ptyWrite`), as Electron's `pty-write` handler did.
- Ported to `src/shared/lib/agents/`: `terminal-intent.ts`,
  `attention-detector.ts`, `prompt-parser.ts`, `autopilot-policy.ts`,
  `autopilot.ts` (logic only, wired in a later ticket), `agent-registry.ts`,
  `custom-agents-store.ts`.
- Background alerts use `desktop.attention`, shipped for
  [request 07](../../chain-sdk-requests/07-attention-alerts.md). As in
  Electron, when the window isn't focused, a waiting agent ("Claude needs
  you") or a finished turn ("Claude is done") shows a notification and
  bounces the Dock once. Clicking a "done" notification raises
  `onAgentFocus` with the run, after Chain has brought the window forward.
  Notifications only work in a `chain build` app; under `chain dev`,
  `notify()` reports `unavailable`.

## Source-of-truth references

- Roadmap rows: AI agents, Agent live monitor; Phase 2 exit criterion.
- Electron source (unchanged): `src/main/ipc/agents.ts`
  (`list-agents`, `add-custom-agent`, `remove-custom-agent`,
  `open-agent-terminal`), `src/main/main.ts` (`AttentionDetector` wiring,
  `emitAttention`, `emitTurnDone`), `src/main/agents/*.ts` listed above,
  `src/preload/api/agents.ts`.
- Electron tests: `tests/main/agents/agent-functionality.test.ts`, ported
  unchanged apart from import paths. It passes on the copy.

## What changed in the copy, and why

- **Hashing.** `prompt-parser.ts` fingerprints a prompt with SHA-1 inside a
  synchronous function. Web Crypto's digest is async only, so
  `src/shared/lib/sha1.ts` is a small synchronous SHA-1, tested equal to
  Node's for 9 inputs (empty, block boundaries, Unicode).
- **Debug switch.** `LAZIFY_DEBUG_ATTENTION` was an environment variable;
  it is now a `localStorage` key of the same name.
- **Timers.** `NodeJS.Timeout` becomes `ReturnType<typeof setTimeout>`.
- **Logger.** `autopilot.ts` logs through `src/shared/lib/diagnostics/logger.ts`,
  a console logger until the diagnostics slice.
- **Registry.** Async. `which` and the nvm folder scan run through
  `process-runner` (`execFile`, `test -e`, `ls`), because `desktop.folders`
  only reads granted folders. `$SHELL`, `$HOME`, `$NVM_DIR` and `$COMSPEC`
  are read with `printenv`.
- **Custom agents.** Async, same JSON file format, stored at
  `<appFolder("data")>/custom-agents.json` so the Electron file can be
  imported as-is.
- **Attention detector.** One addition, `restore(runId, screen)`, for a run
  found again after a page reload: it sets the screen from the session's
  backlog and reads whether the agent is waiting, without treating old
  output as fresh work, so a reload never fires a false "turn done".
- **Where the detector lives.** In Electron it ran in the main process and
  survived renderer reloads. Here it runs in the page, so agent runs are
  tagged in their Chain session (`kind: agent`, `agentId`, `hidden`) and
  re-registered from `desktop.terminal.list()` and their backlog after a
  reload.

## Not ported yet, and where it goes

- Autopilot answering prompts, its settings, and the `hold` reason (always
  `null` for now): autopilot slice.
- Keep-awake while agents work: same slice, with its own Chain request.
- Agent usage, budgets and past sessions (`listAgentSessions`), which read
  `~/.claude/projects` and `~/.codex/sessions`: usage slice, using
  request 01's read-only declared folders.
- Session lint wiring (`prepareSessionLint`): code-quality slice.
- Pasting a clipboard image into an agent: needs a clipboard image
  capability; written when that slice is next.
- Formatting changed files after a turn: formatting slice.

## Acceptance checklist and evidence

- [x] Electron's `agent-functionality.test.ts` passes on the copy (18 tests)
- [x] SHA-1 equals Node's for 9 inputs
- [x] Headless tests (`tests/platform/agents.test.ts`, 10): agent list
      by installed CLI plus custom agents; custom agent ids and removal;
      launch, resume and custom-agent launch through the login shell;
      unknown agent; attention raised and cleared on Enter; one turn-done
      event; agents marked and hidden runs excluded in `listSessions`;
      after a reload a waiting agent is re-announced and no false turn-done
      fires; an ended run is forgotten
- [x] `CI=true npm test` passes (174 tests); typecheck passes
- [x] Real app: `claude` and `codex` detected as installed; a custom agent
      asking "Do you want to proceed?" raised attention; after
      `location.reload()` it was found again as a waiting agent; answering
      from the reloaded page cleared the attention and the agent printed
      `chose 1`; stopping it left no process
- [x] Headless: no alert while focused; one notification and one bounce
      when waiting in the background; a "done" notification whose click
      opens the run, while a "waiting" one's click doesn't
- [ ] Notifications in a built app: permission prompt, notification,
      bounce, and a click that focuses the window and opens the run (needs
      a person; chain-sdk has not seen the click path succeed yet)

## Not removed

Nothing. Nothing in the Electron repo was changed.

## Verification log

- 2026-10-09, macOS arm64, `chain dev`, driven with `chain inspect`.
  `listAgents`: claude and codex available, gemini, copilot and cursor not.
  A custom agent (`printf` question, `read`, `sleep 600`) opened in
  lazify-chain: attention `[true]`. After `location.reload()`: `isAgentRun`
  true, `isWaiting` true, one attention event `true` on subscribing,
  `listSessions` showed it as an agent waiting. `ptyWrite(runId, "1\r")`:
  attention `false`, backlog ended `chose 1`. `stopScript` left no `sleep`
  process; the custom agent was removed.
