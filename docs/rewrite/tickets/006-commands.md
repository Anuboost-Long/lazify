# 006 — One-shot commands (Phase 2 / Done)

**Read this whole ticket before touching code.** Done on 2026-10-09: Electron's
command runner runs real commands through `process-runner`, streams their
output as log events, and answers interactive y/N and numbered prompts.

## Goal

Rebuild the Electron app's `CommandRunner` and the `system` group's command
functions on Chain. Git (ticket 007), project creation and the package
workflows run their commands through it.

## Status — 2026-10-09

- `src/platform/command-runner.ts`: `CommandRunner` (`runCommand`,
  `startScript`, `stopScript`, `chooseCommandOption`) and
  `detectCommandChoicePrompt`, on `desktop.processRunner` (request 03's
  `cwd`, `env` and `keepStdinOpen`).
- `src/platform/commands.ts`: the `system` group's `runCommand`,
  `chooseCommandOption`, `onLog` and `onCommandChoicePrompt`, on one shared
  runner as in Electron's main process.
- Prompt detection pinned by a golden fixture recorded from Electron;
  headless tests for the runner; verified in the running app.

## Source-of-truth references

- Electron source (unchanged): `src/main/command-runner.ts`,
  `src/main/ipc/workflow.ts` (`run-command`, `choose-command-option`),
  `src/preload/api/system.ts`.
- Electron tests: none for this module; a characterisation fixture was
  added for `detectCommandChoicePrompt`.

## What changed in the copy, and why

- `spawn` becomes `desktop.processRunner.run`, with `keepStdinOpen` so a
  prompt can be answered (Node's `spawn` leaves stdin open by default).
  `child.stdin.write` becomes `handle.write`, and `child.kill("SIGTERM")`
  becomes `handle.kill()`, which stops the whole process tree.
- `startScript` is async, because `run()` resolves with the handle. A
  program that can't start is logged on stderr and reported done with exit
  code `null`, where Electron logged the `error` event and then reported
  the `close` code.
- `process-runner` can deliver output before `run()` resolves. Prompt
  detection waits for the handle before offering a choice, so an early
  prompt is still offered (covered by a test).
- `randomBytes` becomes `crypto.getRandomValues`; ids keep their shape.
- `shell: true` on Windows is dropped: `process-runner` never uses a shell.
  Windows `.cmd` shims (`npm.cmd`) are therefore unverified, along with the
  rest of Windows (D-2).
- The error for a missing program is Chain's ("No such file or directory
  (os error 2)"), not Node's ("spawn … ENOENT").

`ANSI_SEQUENCE` through `detectCommandChoicePrompt` is byte-identical.

## Acceptance checklist and evidence

- [x] Golden fixture from Electron (`../scripts/command-prompts-recorder/`):
      14 outputs (y/N in both bracket styles, numbered lists, ANSI colours,
      carriage-return redraws, an OSC title, no prompt, over 30 lines). The
      copy matches all 14.
- [x] Headless tests (`tests/platform/commands/command-runner.test.ts`):
      output and exit, failing exit, a program that can't start, missing
      package manager, prompt answered on stdin, no repeated prompt, prompt
      before the handle, scripts with stop and failed start
- [x] `CI=true npm test` passes (136 tests); typecheck passes
- [x] Real app: `git rev-parse` in a project folder; a real y/N prompt
      answered "yes" through `chooseCommandOption`; a missing program
      rejects with a logged error

## Not removed

Nothing. Nothing in the Electron repo was changed.

## Verification log

- 2026-10-09, macOS arm64. Recorder wrote 14 snapshots from Electron at
  `c9abefc`; the copy matched them with `CI=true`.
- 2026-10-09, macOS arm64, `chain dev`, driven with `chain inspect`.
  `runCommand("git", ["rev-parse", "--abbrev-ref", "HEAD"], lazify-chain)`
  logged `main` and succeeded. A `sh -c` script asking
  "Overwrite config? (y/N)" produced one choice prompt (Yes, No); answering
  "yes" wrote `y\n`, and the script printed `answered:y`. A missing program
  rejected with "No such file or directory (os error 2)", also logged.
