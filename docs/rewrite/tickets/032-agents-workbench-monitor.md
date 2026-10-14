# 032 — Agents workbench and live monitor mode (Phase 6 / Done)

**Read this whole ticket before touching code.** The roadmap's Phase 6
bullet for this area is "restore session hydration before layout
polishing; own each PTY exactly once or support a tested terminal
multiplexer." This ticket checks that risk directly, live, with real
concurrent sessions — no new code, no new Chain request.

## Goal

Confirm the already-ported Agents workbench and Monitor Wall (ticket
015) actually hold up with more than one agent session open at once:
correct, non-cross-contaminated output per panel, and a reload that
reattaches every panel rather than only the one that happened to be
active.

## Status — 2026-10-15

Done. Nothing needed building: the pool that makes "own each PTY exactly
once" true (`src/shared/terminal/terminal-pool.ts`) is pure app code
over `globalThis.lazify.onPtyData`/`ptyBacklog`/`ptyResize`, which is
itself one `desktop.terminal.onOutput` subscription fanned out by
`sessionId` (`src/platform/terminal.ts`) — already the right shape for
concurrency, ported wholesale and unchanged since ticket 015. This
ticket exercises that shape with two real, simultaneous sessions rather
than taking it on faith.

## Source-of-truth references

- Roadmap row: Phase 6, "agents workbench and then live monitor mode"
- Source: `src/shared/terminal/terminal-pool.ts`,
  `src/features/agents/hooks/use-monitor-panels.ts`,
  `src/features/agents/hooks/monitor-session-registry.ts`,
  `src/features/agents/components/AgentMonitorWall.tsx` and siblings —
  all ported in ticket 015, unchanged here
- Already verified elsewhere: single-session launch, resume, attention
  and reattach (ticket 008); autopilot, past sessions, usage, and a
  reattached terminal repainting after a reload (ticket 019); a real
  script surviving a reload in the Scripts pane (ticket 018). What none
  of those checked is **two or more PTYs live on the Monitor Wall at
  once**
- No preload group of its own: `listSessions`, `ptyWrite`, `ptyBacklog`,
  `ptyResize`, `onPtyData`, `onSessionKilled`, `addCustomAgent` (ticket
  008's `agents` group)

## What was checked, and how

Two harmless custom agents (`Probe A`, `Probe B`, each a shell loop
printing its own counter) stood in for real agent CLIs, so the PTY
concurrency path is exercised without spending real Claude/Codex usage —
the terminal pool treats an agent and a script run identically, so a
script-shaped process proves the same code path.

- Both launched in the same project at once
  (`openAgentTerminal`/`listSessions`): each run's own backlog held only
  its own counter, never the other's.
- The Monitor Wall, driven into `monitorMode` and given both run ids
  through `lazify-monitor-wall`'s own storage shape, rendered two
  `xterm` instances, each showing the live, correct, independent counter
  for its own session — confirmed by both a screenshot and reading each
  `.xterm-rows` element's text.
- `ptyResize` on one run's session did not disturb the other.
- **Reload with both panels open and both runs live**: both sessions
  survived (same pid, same `startedAt` — a real reattach, not a
  restart), the DOM rebuilt exactly two `xterm` instances, and each
  showed its counter continuing from where it left off — no gap, no
  duplication, no swap between panels.
- Stopping one run (`stopScript`) left the other running, undisturbed.
- Everything cleaned up afterward: both probe sessions stopped, both
  custom agent registrations removed, the scratch project/layout entries
  cleared from `localStorage`.

## Acceptance checklist and evidence

- [x] Two concurrent sessions, each with its own, never cross-contaminated
      output, confirmed through the backend (`ptyBacklog`) and the DOM
- [x] The Monitor Wall renders both panels correctly at once
- [x] A reload with two live panels reattaches both, not just the active
      one, with no gap or duplication in either
- [x] A resize and a stop on one run leave a second, concurrent run
      undisturbed
- [x] No code changed; `CI=true npm test`, `npm run typecheck` already
      passing on `main` and untouched by this ticket

## Not removed

Nothing. Nothing changed in either repo.

## Rollback

Nothing to roll back — no code was written.

## Open questions

- The quiet/tidy ranking heuristics (`readingShape`, `routineWork`,
  `overflowScreens` in `terminal-pool.ts`) were read, not exercised live
  with real varied output (diffs, routine commands, long prose). They
  are pure functions with no platform dependency, so a bug there would
  be a UI polish issue, not a PTY-ownership one — left for whoever polishes
  the Monitor Wall screen itself, not a parity risk this ticket needed
  to close.
- Panel rename and the tidy-layout action weren't driven end to end
  (no React-internal hook to call from outside the app); their state
  shape (`MonitorSessionRef.title`, `planTidyUp`) was read and is plain
  app-level `localStorage` logic with no Chain dependency, so the same
  "UI polish, not a platform risk" reasoning applies.

## Verification log

- 2026-10-15, macOS 27.0.1 arm64, `chain dev`: two real concurrent PTY
  sessions (`Probe A`/`Probe B`) launched, backlogs isolated, Monitor
  Wall showed both live and independent, a reload reattached both with
  continuous counters (A: …2837→2843, B: …2833→2839 across the reload),
  a stop on one left the other running. All scratch state removed
  afterward.
