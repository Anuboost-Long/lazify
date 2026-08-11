# Agent Live Monitor Mode

Status: in progress — Steps 1–9 done, 2026-08-11
Owner: Ly kimlong

A second mode for the agents page. The workbench shows one agent at a time
behind a tab strip, because a conversation needs the full width. Watching
several agents work does not — it needs them all on screen at once. Live
monitor mode is that view: a grid of terminal panels, three or four to a row,
each one a session you can read without switching tabs.

This document is written to be handed to a coding agent step by step. Each step
below is a self-contained prompt: the goal, the files it may touch, the rules it
must not break, and how to tell it worked. **Do only the step you are given.**
Later steps depend on earlier ones being left in a known state, so do not build
ahead — a panel wired to a PTY in Step 1 makes Step 3's design decision for it.

---

## Ground rules for every step

These apply to all steps and are not repeated in each one.

- **Minimal diff.** Edit only what the step names. No refactors, no renames, no
  reformatting of untouched lines, no drive-by fixes in neighbouring code.
- **Translations are generated.** Add copy to `src/renderer/i18n/lang/en.json`,
  `cn.json`, and `kh.json` under the `agents` object in `snake_case`, then run
  `yarn make:lang`. Never hand-edit `src/renderer/i18n/translation.ts` — it is
  overwritten. Reference strings as `t(translation.Agents.YourKey)`.
- **File length.** 200 lines is the target, 500 is the red zone. A new component
  goes in its own file under
  `src/renderer/features/agents/components/`. `AgentsPage.tsx` is already ~520
  lines: add wiring to it, never UI.
- **Tests live in `tests/`**, mirroring `src/`. Never co-located.
- **Styling** comes from theme tokens (`bg`, `soft`, `text`, `muted`, `accent`,
  `border`) so both themes follow. `border` is a raw CSS var, so
  `border-border/40` does **not** work — use a layered element for a
  translucent edge. `bg`, `soft`, `text`, `accent` do support `/opacity`.
- **Verify before reporting done:** `npx tsc -p tsconfig.json --noEmit`,
  `npx tsc -p tsconfig.node.json --noEmit`, and `yarn test`. All three must be
  clean. Report what you changed, what you preserved, and any assumption.

---

## Step 1 — The grid and its empty panels — DONE

> **Prompt.** Add a "live monitor" mode to the agents page. Entering it replaces
> the tabbed workbench with a grid of empty panels, three per row on a normal
> window and four on a very wide one. Each panel is blank at rest; hovering one
> animates an add button into view. The add button does nothing yet. The user
> must be able to get back to the workbench.
>
> Constraints: do not unmount the workbench when the monitor is showing — the
> terminals underneath hold live PTYs and their own scrollback, and the page
> already hides rather than unmounts for exactly this reason (see the preview
> tab). The panels are inert; do not start any PTY.

**What was built**

| File | Change |
| --- | --- |
| `components/AgentMonitorSlot.tsx` | New. One empty panel. Whole cell is the button. |
| `components/AgentMonitorGrid.tsx` | New. Header, exit control, responsive grid. |
| `components/AgentToolRail.tsx` | New `onOpenMonitor` prop + `multi-window` rail button, above a divider. |
| `pages/AgentsPage.tsx` | `monitorMode` state; workbench row gets `hidden`; grid renders as a sibling. |
| `i18n/lang/{en,cn,kh}.json` | `live_monitor`, `live_monitor_desc`, `live_monitor_exit`, `monitor_add_panel`. |

**Decisions worth knowing before Step 2**

- **The workbench is hidden, not unmounted.** `monitorMode && "hidden"` on the
  workbench row, with `AgentMonitorGrid` as its sibling. Leaving the mode
  restores every terminal exactly as it was.
- **The monitor takes the whole page**, including the space the project rail
  occupies. Panel width is the scarce resource once six are on screen.
- **Entry is on the tool rail, exit is on the monitor header.** The rail is
  hidden inside the mode, so it cannot hold the way out.
- **The slot is one big button.** A small add target inside a large empty panel
  is worse to hit than the panel itself. `group-hover` and `group-focus-visible`
  both drive the animation, so keyboard users get the same affordance.
- **`MONITOR_SLOT_COUNT = 6` is provisional** — a placeholder for Step 2, not a
  designed limit.

---

## Step 2 — Filling a panel — DONE

> **Prompt.** Make pressing a panel work. It opens a selector listing the synced
> projects. Choosing one then asks what should run in it: an AI agent, or a
> command from that project (`dev` or any other script). The agent route uses
> the existing agent modal rather than a new list. Once chosen, that panel shows
> what it is pointed at and can be emptied again.
>
> Still no PTY: the panel body is a placeholder in this step.

**What was built**

| File | Change |
| --- | --- |
| `hooks/use-monitor-panels.ts` | New. `panels` / `assign` / `clear`, and the `MonitorPanel` shape. |
| `components/AgentMonitorSetupModal.tsx` | New. The project → source → script questions. |
| `components/AgentMonitorPanel.tsx` | New. A filled panel: header + placeholder body. |
| `components/AgentMonitorGrid.tsx` | Renders filled panels before empty slots; hosts both modals. |
| `pages/AgentsPage.tsx` | Calls `useMonitorPanels`, passes projects and agent CRUD down. |
| `i18n/lang/{en,cn,kh}.json` | 13 `monitor_*` keys. |

**The flow**

```
empty slot ──▶ [project list] ──▶ [what should run?] ──┬──▶ [script list] ──▶ panel
                                                       └──▶ AgentPickerModal ──▶ panel
```

**Decisions made**

- **Every panel picks its own project.** Confirmed: watching one project's
  agents is what the tabbed workbench already does, so a per-grid project would
  make the mode redundant. `MonitorPanel` therefore carries `projectPath` and
  `projectName`, and the panel header shows the project.
- **The agent route hands off to `AgentPickerModal` rather than listing agents
  again.** That modal already carries custom-agent creation, deletion, and
  session resume; a second copy would drift. `AgentMonitorSetupModal` closes
  itself before opening it so two dialogs never stack.
- **The setup modal answers both questions in one dialog** (project, then what
  to run) because they are one decision — a project with nothing running in it
  is not something to watch.
- **Scripts are read on reaching the script list**, not on picking the project:
  the agent route never needs them. `globalThis.lazify.listScripts(path)` takes
  any path, so it works per panel. `null` means loading, `{}` means none — kept
  distinct so the empty case does not flash as a result.
- **The grid grows.** `MONITOR_MIN_SLOTS = 6` is now a floor, not a total:
  `emptySlotCount = max(6 - panels.length, 1)`, so there is always at least one
  empty slot to add into and the wall never fills up.
- **Panel state lives in `AgentsPage` via `useMonitorPanels`**, not in the grid,
  because the grid unmounts on leaving the mode. It is still in-memory only —
  see Step 4.

**Known gap:** `AgentMonitorSetupModal.tsx` is ~250 lines, over the 200-line
target. The three stages share one header and one scroll body, so splitting
them costs more than it saves. Revisit if it grows again.

**Note for Step 3:** `MonitorPanel.resumeSessionId` is captured from the agent
picker and currently unused — it exists so resuming a conversation still works
once the PTY is wired up. Do not drop it.

---

## Step 3 — Live terminals in the panels — DONE

> **Prompt.** Once a panel is established it should open a real command panel —
> writable and editable, the same as the agents page terminal — not a read-only
> feed. Also reduce the density: three panels per row at most, dropping to two
> when they get too small to read.

**What was built**

| File | Change |
| --- | --- |
| `hooks/use-monitor-panels.ts` | Starts the PTY on assign, kills it on clear; tracks `runId` / `exited` / `error`; listens for exit and outside kills. |
| `components/AgentMonitorPanel.tsx` | Body is now `XTermPanel`. Fixed `h-[22rem]`; header shows an "Exited" tag. |
| `components/AgentMonitorSlot.tsx` | Same `h-[22rem]`, so a part-filled row stays level. |
| `components/AgentMonitorGrid.tsx` | Density now `1 → md:2 → 2xl:3`. |
| `i18n/lang/{en,cn,kh}.json` | `monitor_panel_exited` replaces `monitor_panel_placeholder`. |

**Decisions made**

- **The wall owns its runs; it does not mirror workbench tabs.** The hazard
  noted in Step 2 was two `XTermPanel`s mounted on one `runId`. Resolved by not
  reusing `useAgentTerminals`: that hook is scoped to a single project and keys
  its tabs by project path, so opening a monitor panel through it would also
  push a tab into the workbench strip. Monitor panels call
  `openAgentTerminal` / `runScript` directly and hold their own `runId`.
- **`isActive` on, `autoFocus` off.** Every panel is visible at once, so each
  refits on mount; but six terminals grabbing the caret as they start would make
  the wall unusable. Focus follows the click, which xterm handles itself.
- **A panel that fails to start stays on the wall carrying the error** rather
  than vanishing, which would make the click look like it did nothing.
- **Exit marks, an outside kill removes.** A finished run's output is usually
  what the wall was opened to read, so `onScriptStatus` only tags it "Exited".
  A session killed elsewhere (the sessions pane) has nothing left to show, so
  `onSessionKilled` drops the panel back to an empty slot.
- **Clearing a panel kills its process** (`stopScript`), matching what closing a
  workbench tab does. The lookup runs off a ref, not inside the state updater,
  which React may replay.
- **Density is `1 → md:2 → 2xl:3`.** Four across was too narrow to read.
- **Panels are a fixed `h-[22rem]`** rather than aspect-driven: a terminal wants
  a predictable row count, and equal heights keep a part-filled row level.

**Follow-up: the agents route went full-bleed**

The wall was capped at `max-w-[1560px]` by `AppShell`, wasting a large screen,
and `AgentsPage` set `h-[calc(100vh-6.5rem)]` — a viewport subtraction that only
held at one window size. Both are gone:

- `AppShell.tsx` — `fullBleed` now covers `appRoute.agents` as well as the
  project workbench. The route gets `max-w-none p-4` and an `overflow-hidden`
  container it is expected to manage itself. That padding was `px-4 py-3`;
  it is now even on all four sides, which the project workbench inherits too.
- `AgentsPage.tsx` — root is `h-full`, taking its height from that container.

Side effect, deliberate: `ContentBackdrop` does not render behind full-bleed
routes. The agents page is as dense as the workbench, which is the same reason
the workbench opted out.

**Still open**

- Font size is `XTermPanel`'s fixed 12.5px. Readable at half width; check it
  again at three across on a smaller 2xl window.
- Six `XTermPanel`s refitting together on a window drag is the performance risk
  in this feature. Not yet measured under load.
- Nothing reconnects a monitor panel after a renderer refresh — the PTYs survive
  in main, but the wall forgets them. `useAgentTerminals` solves this with its
  `sessionsHydrated` rebuild; the wall needs the same in Step 4.

---

## Step 3b — The tool rail on the wall — DONE

> **Prompt.** The right-hand tool rail should be present in live monitor mode
> too. Some of its tools are panel-specific; others — session changes and the
> like — should open as a modal while on the wall. Project files and
> "path to agent" stay global, but need to be selective about which panel the
> information is sent to.

**What was built**

| File | Change |
| --- | --- |
| `components/rail-panel-shell.ts` | New. The shell all four rail panels share, in `rail` or `modal` form. |
| `AgentChanges/Activity/Files/UsagePanel.tsx` | Each takes `variant?: RailPanelVariant` and uses that shell. No other change. |
| `components/AgentRailPanelHost.tsx` | New. Passes a panel through in the workbench; lifts it into a `BaseModal` on the wall. |
| `components/AgentMonitorRail.tsx` | New. The wall's rail: scoped tools, a divider, then the global ones. |
| `components/AgentToolRail.tsx` | `RailButton` exported and given a `disabled` state. |
| `hooks/use-monitor-panels.ts` | Tracks `target` / `setTarget`. |
| `components/AgentMonitorPanel.tsx` | Selectable, with an accent edge and a "Selected" tag. |
| `components/AgentMonitorGrid.tsx` | Takes the rail as a `ReactNode` and lays it against the outer edge. |
| `pages/AgentsPage.tsx` | `railProjectPath` scoping; the four panels wrapped in the host. |

**The three groups**

| Tool | On the wall |
| --- | --- |
| Changes, Files, Console, Path to agent | Scoped to the **selected panel**. Disabled until one is picked; the tooltip names the project it will act on. |
| Activity, Usage | Global already — unchanged, just shown as modals. |
| Debug, Preview | **Not offered.** Both act on one project's run and have no wall-wide meaning yet. |

**Decisions made**

- **The selected panel replaces "the selected project".** The workbench scopes
  its rail to one project; the wall has no such thing, so `railProjectPath`
  resolves to the selected panel's project whenever monitor mode is on. One
  concept covers changes, files, the path picker and the OS console at once.
- **Selection follows the work.** `onMouseDownCapture` and `onFocusCapture` on
  the panel, both capture-phase so they never swallow a click into the terminal.
  Typing into a panel is the clearest possible statement of where a file should
  be sent. Assigning a panel also selects it.
- **Panels became modals, not a second column.** 288px of rail is most of what
  widening the terminals to two-across bought back. `BaseModal` portals to the
  body, so the panels still render while the whole workbench row is `hidden`.
- **The rail panels themselves were not forked.** They take a `variant` that
  picks one of two container shapes and are otherwise untouched, so the
  workbench and the wall cannot drift apart.
- **`railTab` is shared between the two modes** rather than duplicated. Opening
  changes on the wall and then leaving the mode lands on the same panel, rescoped
  to the workbench project.
- **The rail is injected into the grid as a `ReactNode`.** The page owns every
  hook the rail's data comes from; passing the built element avoids threading a
  dozen props through the grid to reach it.
- **Opening a run from the activity feed leaves the wall.** The run lives in a
  workbench tab, so the mode closes rather than leaving the click doing nothing
  visible.

**Known gap:** `AgentsPage.tsx` is now 598 lines, past the 500-line red zone.
The four rail-panel blocks are the obvious extraction — an `AgentRailPanels`
component — but it needs ~15 props and was out of scope here.

---

## Step 3c — Resizing and reordering — DONE

> **Prompt.** Let the user decide which panels expand and which stay at the
> default size, using the grid system to do it. Dragging a panel should reorder
> the wall.

**What was built**

| File | Change |
| --- | --- |
| `hooks/use-monitor-panels.ts` | `MonitorPanelSize`, `size` on each panel, `resize` (cycles), `reorder` (splice move). |
| `components/AgentMonitorPanel.tsx` | Grid-span classes, a resize button, header drag handle, whole-panel drop target. |
| `components/AgentMonitorGrid.tsx` | `auto-rows-[22rem]`; local drag state; passes the new handlers. |
| `components/AgentMonitorSlot.tsx` | `h-full` instead of a fixed height. |
| `i18n/lang/{en,cn,kh}.json` | 5 keys: `monitor_resize`, three size names, `monitor_reorder`. |

**Sizes**

| Size | Span | At `md` (2 cols) | At `2xl` (3 cols) |
| --- | --- | --- | --- |
| `default` | 1×1 | half width | a third |
| `wide` | 2×1 | full width | two thirds |
| `large` | 2×2 | full width, double height | two thirds, double height |

**Decisions made**

- **Sizes are grid spans, not pixels.** The wall is already a responsive grid,
  so "expand" claims another column and, at `large`, another row. Everything
  reflows for free and the sizes keep meaning when the window changes the
  column count underneath them.
- **Rows are `auto-rows-[22rem]`, panels are `h-full`.** A fixed row height is
  what makes `row-span-2` land on exactly twice the height plus the gap.
- **The column span waits for `md`.** At one column there is no second column
  to claim, so `col-span-2` would overflow.
- **Span classes are written out whole** in `SIZE_SPAN`. Tailwind scans source
  for literal class strings — a class assembled at runtime is never generated.
  Verified with a real `tailwindcss` compile: `md:col-span-2`, `row-span-2` and
  `auto-rows-[22rem]` are all in the output.
- **One cycling resize button, not three.** The header has room for one control
  and the sizes form a natural loop. The tooltip names the current size.
- **Only the header is `draggable`.** A draggable container around a terminal
  eats every attempt to select its output. `setDragImage` points at the panel
  root so the ghost is the whole panel, not the strip that started it.
- **The whole panel is the drop target**, so a drop does not have to land on the
  thin header. `dragleave` ignores moves into its own children — without that
  the highlight flickers the whole way across.
- **No `grid-flow-dense`.** Dense packing would fill the holes a `large` panel
  leaves, but it also reflows items out of array order, which would fight
  drag-to-reorder. Visual order stays equal to list order; holes are the price.

**Still open:** sizes and order are in-memory, like the assignments — Step 4.

---

## Step 3d — Choosing the grid — DONE

> **Prompt.** There should be a modal for the user to select what grid they want.

**What was built**

| File | Change |
| --- | --- |
| `components/AgentMonitorLayoutModal.tsx` | New. Four options, each with a thumbnail of the layout. |
| `hooks/use-monitor-panels.ts` | `MonitorColumns`, `MONITOR_COLUMN_CHOICES`, `columns` / `setColumns`. |
| `components/AgentMonitorGrid.tsx` | `COLUMN_CLASS` lookup; a layout button in the header; hosts the modal. |
| `components/AgentMonitorPanel.tsx` | Takes `allowSpan`. |
| `i18n/lang/{en,cn,kh}.json` | 5 `monitor_layout*` keys. |

**The choices**

| Choice | Classes | Behaviour |
| --- | --- | --- |
| Auto (default) | `grid-cols-1 md:grid-cols-2 2xl:grid-cols-3` | What the wall did before the choice existed. |
| 1 per row | `grid-cols-1` | One agent, read closely. |
| 2 per row | `grid-cols-1 md:grid-cols-2` | Pinned at two on any window wide enough. |
| 3 per row | `grid-cols-1 md:grid-cols-3` | Three from `md` up, rather than waiting for `2xl`. |

**Decisions made**

- **Every choice still collapses to one column below `md`.** Three terminals
  across a narrow pane is not a layout anyone wants; it is only what "three
  columns" would literally mean. The pin applies from `md` up.
- **One column disables panel spans** (`allowSpan={columns !== 1}`). A
  `col-span-2` in a single-track grid creates an *implicit* second column and
  pushes the panel off the edge — CSS grid does not clamp it. The stored size is
  kept, so switching back to two or three columns restores it.
- **Options carry a thumbnail, not just a number.** Two rows of cells drawn at
  the option's column count; the layout is the thing being chosen, so it should
  be visible.
- **The trigger is `multi-window` in the wall's header.** It is the mode's own
  icon, but the rail button that uses it is not on screen inside the mode, so
  there is no collision.
- **Verified with a real `tailwindcss` compile** that `md:grid-cols-3`,
  `md:grid-cols-2` and `2xl:grid-cols-3` all reach the stylesheet. (The last one
  escapes to `.\32xl\:grid-cols-3` — a leading digit — which is easy to
  mis-grep and conclude is missing.)

**Still open:** the choice is in-memory with everything else — Step 4.

---

## Step 5 — One set of sessions, two views — DONE

> **Prompt.** The monitor still does not restore a saved agent session or a
> running command session back into a panel. Make an object to reference a
> session when a terminal session is started, carrying its size and its
> active-panel memory. A terminal opened from the normal agent panel should be
> remembered into the live monitor as its own session too.

**Why Step 4 did not work**

Two defects, both from the wall keeping its own copy of the session list.

1. **State was component-local.** `useMonitorPanels` used `useState`, and
   `AgentsPage` unmounts whenever the user navigates away. On remount the
   module-scoped `wallHydrated` guard was already `true`, so hydration was
   skipped, `panels` was `[]` — and then the save effect fired and wrote that
   emptiness over the stored record. One trip to another page destroyed the wall
   *and* its memory. `useAgentTerminals` avoids this with module-level atoms and
   a comment saying exactly why; the wall did not follow it.
2. **The wall only knew about its own runs.** A terminal opened from the tab
   strip was invisible to it by construction.

**The change**

The wall is now a **view over `listSessions()`**, not a second list. Identity —
project, label, agent-or-script — belongs to the PTY in main, which outlives any
renderer. What the wall adds is placement.

| File | Change |
| --- | --- |
| `hooks/monitor-session-registry.ts` | New. `MonitorSessionRef` — `{ runId, size, order }` — plus `columns` and `activeRunId`. Replaces `monitor-panel-store.ts`. |
| `hooks/use-monitor-panels.ts` | Module atoms; `sync()` rebuilds from main; `start()` launches and registers. |
| `hooks/use-agent-terminals.ts` | Ownership filter reverted — both views show every session. |
| `components/AgentMonitorGrid.tsx` | Keyed on `runId`; `onAssign` → `onStart`. |
| `components/AgentMonitorPanel.tsx` | A panel implies a live run, so the error and loading branches are gone. |
| `pages/AgentsPage.tsx` | Re-syncs whenever the wall is opened. |

**Decisions made**

- **The run id is the panel's identity.** One session, one panel, in either
  view. The generated `monitor-panel-N` ids are gone, and with them the
  `panelSequence` collision problem.
- **`MonitorSessionRef` holds placement only.** Storing the label and project
  again is what let the two views disagree. Anything a session *is* comes back
  from `listSessions()`; anything about *where it sits* is here.
- **A session with no ref still appears** — at the default size, at the end.
  That is how a workbench-opened terminal lands on the wall without anything
  having to tell the wall about it.
- **`sync()` runs on mount and on opening the wall**, not once per renderer
  load. Main has no "session started" event, so asking is the only way to learn
  about a run started elsewhere in the meantime.
- **Placements are pruned against the live set on every sync**, so the record
  cannot grow without bound across restarts.
- **Exited panels last only until the next sync.** `pty-runner.ts:124` deletes a
  session the moment its process ends, taking its backlog with it — so a panel
  kept past that would show an empty terminal. `onScriptStatus` still marks it
  while it is on screen, which is when the output is still worth reading.

**Known gap:** a session that fails to start leaves no panel and no message —
there is no session to hang the error on. Needs a toast on the wall.

---

## Step 6 — Picking a panel size directly — DONE

> **Prompt.** The resize button should open a modal to select the size outright,
> instead of toggling through them.

**What was built**

| File | Change |
| --- | --- |
| `components/AgentMonitorSizeModal.tsx` | New. Three sizes, each with a 2×2 thumbnail of the footprint it claims. |
| `hooks/use-monitor-panels.ts` | `resize(runId)` → `setSize(runId, size)`. |
| `components/AgentMonitorPanel.tsx` | `onResize` → `onPickSize`; the button opens the chooser. |
| `components/AgentMonitorGrid.tsx` | Holds `sizingRunId` and hosts one chooser for the whole wall. |
| `i18n/lang/{en,cn,kh}.json` | Size names retitled, plus per-size descriptions and the modal's title. |

**Decisions made**

- **Cycling was fine for two states and tiring for three** — large back to
  default meant a full lap. Every size is now one click from every other.
- **One chooser for the wall, not one per panel.** Only ever one is open, and
  the grid tells it which panel it is acting on. Mounting a modal inside every
  panel would put six on the page to use one.
- **The thumbnail is a 2×2 with the footprint filled in**, matching the layout
  modal's approach: a size is expressed in grid cells, so the preview is the
  grid rather than a scaled rectangle.
- **The header button still reports the current size** via its icon
  (`collapse` at large, `expand` otherwise) and its tooltip. It opens a chooser
  now, but it should still answer "how big is this panel" at a glance.
- **The modal names the panel it is sizing** in its overline — the wall can hold
  a lot of panels, and a bare "Panel size" would not say which.

---

## Step 7 — Naming panels, and clearing the wall — DONE

> **Prompt.** Each session or monitor item should be renamable to fit what it is
> doing. Also add a button to clear all the monitor.

**What was built**

| File | Change |
| --- | --- |
| `components/AgentMonitorRenameModal.tsx` | New. Text field, save, and an explicit "use default name". |
| `hooks/monitor-session-registry.ts` | `MonitorSessionRef.title?`. |
| `hooks/use-monitor-panels.ts` | `rename(runId, title)`, `clearAll()`, and `displayName` on each panel. |
| `components/AgentMonitorPanel.tsx` | The name is now a button that opens the rename dialog. |
| `components/AgentMonitorGrid.tsx` | Hosts the dialog; a `trash` control in the header behind a `ConfirmModal`. |
| `i18n/lang/{en,cn,kh}.json` | 7 keys across rename and clear-all. |

**Decisions made**

- **The name is the control.** The header had two icon buttons already and no
  room for a third, and clicking a name to change it needs no explaining. A
  plain click renames; dragging from the same spot still drags the panel, since
  a drag only begins once the pointer moves.
- **`displayName` is computed in the hook**, not in the component: `title` when
  set, the session's own label otherwise. The components never have to remember
  the fallback rule.
- **Clearing the name is offered as its own button.** An empty text field does
  not look like a way back, so "Use default name" says it outright. Disabled
  when there is no custom name to remove.
- **A title survives `setSize` and `reorder`.** Both rewrite refs wholesale —
  `reorder` rebuilds every one of them — so both now spread the existing ref
  rather than constructing a fresh one. This was the trap in the change; it
  would have silently erased names on a drag.
- **Clear-all stops the processes, not just the panels.** A panel *is* a
  session, so emptying the wall without killing the runs would strand them
  invisible. That is why it is gated behind `ConfirmModal` with `destructive`,
  and why the description counts what is about to stop.
- **The clear-all button only appears when the wall has something on it**, and
  each `stopScript` catches its own failure — a run that has already ended
  should not stop the rest from being cleared.

---

## Step 8 — Alerts on the wall — DONE

> **Prompt.** Make sure alerts and notifications still work in monitor mode, and
> that the wall shows which panel needs action.

**What already worked — verified, not changed**

| Path | Why it survives the mode |
| --- | --- |
| Attention toast | A direct child of `AgentsPage`'s root, outside the workbench row that monitor mode hides. |
| `AgentDoneToast` | Mounted in `AppShell.tsx:232`, so it is not the agents page's to lose. |
| OS notification | Raised in main, unaffected by anything in the renderer. |
| Activity feed + unread badge | Already on the wall's rail from Step 3b. |

**What was built**

| File | Change |
| --- | --- |
| `hooks/use-agent-terminals.ts` | Returns `waitingByRunId` — the same atom the tab strip reads. |
| `components/AgentMonitorPanel.tsx` | Waiting state: accent border, `shadow-glow`, pulsing dot, "Needs attention". |
| `components/AgentMonitorGrid.tsx` | Takes `waitingRunIds`. |
| `pages/AgentsPage.tsx` | Passes them through; the activity feed now selects a wall panel. |

**Decisions made**

- **The waiting set is read, not re-derived.** `useAgentTerminals` already owns
  `waitingProjectByRunIdAtom` and re-seeds it from `session.waiting` after a
  refresh. Subscribing to `onAgentAttention` again in the wall would double-count
  and drift; exposing the atom keeps one source of truth.
- **The marker is louder than the tab strip's.** A 1.5px dot is findable along
  one row of tabs and invisible across a grid of six panels, so the panel also
  takes an accent border and `shadow-glow`. The dot and wording stay identical
  to the tab strip, so the two views report the same thing the same way.
- **"Selected" is suppressed while a panel is waiting.** Both are accent text in
  the same header; only one of them should be shouting, and it is not the one
  saying where the file picker will type.
- **The activity feed no longer exits the mode.** Since Step 5 the wall shows
  every session, so a run reached from the feed is already on it — clicking a
  row selects its panel instead of dropping the user out to find a tab.

---

## Step 9 — Wall sessions reach the tab strip — DONE

> **Prompt.** A session started from monitor mode should also appear in the
> default agent panel, split by project.

**The gap**

Step 5 made the two views share one set of sessions, but only one direction was
wired. The wall re-reads `listSessions()` whenever it opens, so a run started in
the tab strip appears on it. The tab strip had no equivalent — its rehydration
is a one-shot guarded by module-scoped `sessionsHydrated`, which was enough while
every session started there. A run started on the wall therefore had no tab until
a full renderer reload.

**What was built**

| File | Change |
| --- | --- |
| `hooks/use-agent-terminals.ts` | `sessionsToTerminals()` extracted; new `syncSessions()` adopts any tabless session. |
| `pages/AgentsPage.tsx` | One effect syncs whichever direction the mode change needs. |

```
opening the wall  ──▶ monitorPanels.sync()   (main ──▶ wall)
leaving the wall  ──▶ syncSessions()         (main ──▶ tab strip)
```

**Decisions made**

- **Splitting by project is free.** `useAgentTerminals` already filters tabs by
  `projectPath`, and a session carries its own — so an adopted run lands in its
  own project's strip, not the one on screen. No grouping code was needed.
- **`syncSessions` only adds.** A tab whose run has ended is already handled by
  the exit and kill listeners; the only gap was a session with no tab. Removing
  here as well would have raced those listeners.
- **The mapping is shared, not copied.** `sessionsToTerminals()` is used by both
  the one-shot rehydration and the new sync, so the two cannot drift — and it
  applies the same agent-label rule the wall uses, which is what keeps a session
  named identically in both views.
- **A newly adopted project gets its tab selected**, but only when it has none.
  A project the user has already chosen a tab for is left alone.
- **The effect had to sit below `useAgentTerminals`.** Placed with the other
  monitor state near the top of the component, `syncSessions` is in its own
  temporal dead zone — the dependency array is evaluated during render, before
  the destructuring runs. `tsc` catches it (TS2448); worth knowing before moving
  this effect again.

---

## Step 4 — Persistence — SUPERSEDED BY STEP 5

> **Prompt.** A previous session comes back into the default workbench panel
> instead of returning to its live monitor panel. Each panel should also
> remember its own size, and the wall its grid choice.

**The bug**

`useAgentTerminals` rehydrates after a renderer refresh by asking main for every
live PTY and turning each into a tab. It had no way to tell a run the wall
started from one the tab strip started, so it claimed all of them — the sessions
reappeared as workbench tabs and the wall came back empty. The wall had no
rehydration of its own either, so there was nothing to come back to.

**What was built**

| File | Change |
| --- | --- |
| `hooks/monitor-panel-store.ts` | New. `loadMonitorWall` / `saveMonitorWall` / `monitorOwnedRunIds`. |
| `hooks/use-monitor-panels.ts` | Rehydrates once per renderer load; saves on every change. |
| `hooks/use-agent-terminals.ts` | Its rehydration now skips runs the wall owns. |
| `tests/renderer/agent-monitor-wall-store.test.ts` | New. 6 tests over the stored record. |

**What is remembered**

Per panel: project, what it runs, its run id, and **its size**. Wall-wide: the
**column choice**, and panel order, which is just the array order.
`exited` and `error` are not stored — they are re-derived from what main reports.

**Decisions made**

- **The stored run ids are the ownership marker.** There is no server-side
  notion of which surface started a run, and adding one would mean a main-process
  change for a renderer-layout problem. The wall already has to write down its
  panels to restore them, so that record answers "whose run is this?" for free.
  `monitorOwnedRunIds()` reads storage directly rather than being a React value:
  the tab strip needs it inside a one-shot effect that runs before any wall
  state exists.
- **`localStorage`, not the app store**, matching `lazify-run-script-overrides`
  in `use-agent-terminals.ts`. This is renderer-local view state tied to one
  machine, not project data the store is responsible for.
- **A panel whose run is gone is dropped.** Storage is intersected with
  `listSessions()` on the way back in — a process that died while the renderer
  was away has nothing to come back to.
- **Saving is gated behind `hydrated`.** The save effect firing against the
  empty starting state would erase the record before it could be read. This is
  the trap in the whole change.
- **`panelSequence` is stepped past every restored id.** The counter restarts at
  zero on reload, so without this the next new panel would collide with a
  restored one.
- **Panels already in state win over the record.** A panel created in the same
  render pass is newer than what is on disk.

**Still open:** a run that main has already ended before the wall rehydrates is
dropped silently. Showing it as an exited panel with its scrollback would be
better, but `listSessions()` only returns live runs.

_(To be filled in as the step is carried out.)_

---

## Step 5 — Tests

> **Prompt.** Add `tests/renderer/agent-live-monitor.test.ts` mirroring the style
> of `tests/renderer/agents-page-functionality.test.ts`. Cover: entering and
> leaving the mode, that the workbench is hidden and not unmounted, that an
> empty panel exposes its add affordance, and panel assignment from Step 2.

_(To be filled in as the step is carried out.)_
