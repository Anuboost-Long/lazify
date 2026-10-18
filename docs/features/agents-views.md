# Agents: Tabs and Live monitor

The Agents page has two views of separate session sets: **Tabs** (one agent at
a time, a tab per session in the selected project) and **Live monitor** (a wall
of sessions from any project).

## Behaviour

- A compact **Tabs | Live monitor** switch in the shell's top bar says which
  view is showing, counts the wall's sessions, explains each view on hover,
  and toggles with ⌘⇧M. It replaces the tool rail's unlabelled monitor button
  and the wall's × exit.
- **Tours**, spotlighting one element at a time as Mneme's do, play the first
  time each view is seen, and again from the **Show me how** (?) button
  beside the switch:
  - Tabs: the switch, the project picker, New agent, the tool rail, Show me how.
  - Live monitor: the first empty slot, the grid layout, the wall's tools,
    the switch back.
- The first empty wall slot always shows "Add agent"; the others still reveal
  it on hover.

## Source

- `src/shared/ui/Tour.tsx` — `Tour` (steps point at `data-tour` elements;
  ones not on screen are skipped; Esc or Skip ends it) and
  `useFirstTimeTour(key, ready)`, remembered in `localStorage` as
  `lazify-tour-<key>`.
- `src/features/agents/pages/AgentsPage.tsx` — the switch, the two tours.
- `tests/features/agents/agents-view-switch.test.ts`.
