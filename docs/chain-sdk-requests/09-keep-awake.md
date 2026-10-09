# Capability Request 09 — Keep the Mac awake while an agent works

Source: the Lazify rewrite to Chain, Phase 4 ticket 016 (settings) and the
agents slice. Row: AI agents ("usage, budget/rate-limit, attention,
autopilot and keep-awake state match").

**Not part of this request:**
- Waking a sleeping machine, or scheduling anything.
- Anything about the screen saver or locking.

## Why this needs a new capability

Nothing in Chain talks to the system's power management. Running
`caffeinate` through `process-runner` would work on macOS only, leaves a
child process to track, and can't be released reliably if the app crashes;
the OS-level assertion is released automatically when the process exits.

## What Lazify actually does with this today (Electron, verified in source)

`src/main/agents/awake-guard.ts`: when the user turns "Keep awake" on
(`keep-awake.json`, a Settings switch) and at least one agent is busy (the
attention detector's busy state, ticket 008), Lazify holds one
`powerSaveBlocker.start("prevent-display-sleep")` for the whole app, and
stops it once no agent is busy or the setting is turned off. Agents run
unattended for minutes; the machine sleeping mid-turn silently stalls them.

## What Lazify needs

- **Start an assertion** that keeps the system (and, as Electron does, the
  display) from idle-sleeping, with a reason string the OS can show
  (`pmset -g assertions` shows it on macOS).
- **Stop it.** Idempotent.
- Released automatically if the app quits or crashes.
- Optional: whether one is held, for diagnostics.

Lazify keeps the reference counting (which agents are busy) itself; one
assertion at a time is enough.

## Platforms

macOS first (D-2).

## Suggested next step for chain-sdk

When it ships, Lazify wires `AwakeGuard` to it and checks with
`pmset -g assertions` that the assertion appears while an agent works and
disappears after its turn.
