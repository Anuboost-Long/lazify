# 004 — Terminal sessions (Phase 2 / Done)

**Read this whole ticket before touching code.** Done on 2026-10-09: a real
session started in the app survives a page reload, and the reloaded page
reattaches without losing or repeating output.

## Goal

Rebuild the Electron app's `PtyRunner` (the session half of the `scripts`
preload group) as `src/platform/terminal.ts` on `desktop.terminal`
(request 04). It keeps Electron's shapes, so the renderer's terminal pool,
sessions pane and agent panes port without changes to how they attach.
Starting a *script* (package manager choice, .NET, dev ports) is the next
ticket, built on this one.

## Status — 2026-10-09

- `src/platform/terminal.ts`: `startPty`, `listPtySessions`, `ptyBacklog`,
  `ptyWrite`, `ptyResize`, `killPty`, `onPtyData`, `onScriptStatus`.
- `src/shared/types/sessions.ts` copied verbatim from the Electron renderer.
- `tests/platform/terminal.test.ts` drives it headlessly against
  `fake-terminal.ts`, an in-memory `desktop.terminal` that follows Chain's
  contract. A module reset stands in for a page reload.
- Verified in the running app, including a real `location.reload()`.

## Source-of-truth references

- Roadmap row: Scripts and terminal; Phase 2 exit criterion (a terminal
  survives UI reload and can reattach).
- Electron source (unchanged): `src/main/pty-runner.ts`,
  `src/main/ipc/scripts.ts` (`pty-write`, `pty-backlog`, `pty-resize`,
  `list-sessions`, `stop-script`), `src/preload/api/scripts.ts`,
  `src/renderer/shared/types/sessions.ts`.
- Electron consumer that must keep working: the renderer's
  `shared/terminal/terminal-pool.ts`, which reattaches with `ptyBacklog`
  and drops replayed chunks by `seq`.

## How Electron behaviour maps onto Chain

| Electron `PtyRunner` | `src/platform/terminal.ts` on `desktop.terminal` |
| --- | --- |
| `runId` is `pty-<time>-<hex>`; callers test `startsWith("pty-")` | `runId` is `pty-` plus Chain's session id |
| 220×50 default, `xterm-256color` | Same default size; Chain sets `TERM=xterm-256color` |
| `scriptName`, `projectPath` kept in main | Stored as the session's `label` and `metadata` |
| Session forgotten as soon as it exits | Exit reported, then `remove()`d. Sessions that exited while the page was reloading are removed on first use |
| 512 KB backlog, trimmed by whole chunks | Chain's default, same rule |
| Group kill, SIGKILL after 2 s, gives up after 5 s | Chain's `kill()` does the same; its `TIMEOUT` is swallowed so a stop always resolves, as `killAndWait` did |
| `write`/`resize` to a missing session are silent | Same (rejections ignored) |
| Backlog of an unknown session is `{ data: "", seq: 0 }` | Same |

**Not verified against Electron:** a session that was killed reports
`exitCode: null` with status `error`, because Chain reports a signal as
`code: null`. node-pty's exit code for a signalled process was not
checked. Callers that care about a user stop use the separate
"session killed" event, which arrives with the scripts ticket.

## Acceptance checklist and evidence

- [x] `CI=true npm test` passes (93 tests); `npm run typecheck` passes
- [x] Headless tests: start, output with `seq`, session info, exit then
      forget, reload with backlog and live output, exits during a reload,
      input and resize, stop including a stop that times out
- [x] Real app: survives `location.reload()` with contiguous backlog and
      gap-free live output
- [x] Real app: stop from the reloaded page reports status, forgets the
      session, leaves no process behind
- [ ] Windows (Chain's terminal is unverified there; first release is
      macOS-only, D-2)

## Not removed

Nothing. Nothing in the Electron repo was changed.

## Verification log

- 2026-10-09, macOS arm64, `chain dev`, driven with `chain inspect`.
  Started `sh -c` printing `tick N` every 100 ms in lazify-chain. After
  about 7 s, `location.reload()`. The reloaded page listed the session
  (`ticks@lazify-chain`); `ptyBacklog` returned ticks 1–71, contiguous,
  at `seq` 71; live `onPtyData` continued at `seq` 72 through 86. `killPty`
  from the reloaded page took 380 ms, emitted
  `{ status: "error", exitCode: null }`, and left no `sh` process.
