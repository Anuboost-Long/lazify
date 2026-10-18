# Home

The desktop the app opens on: a clock, icons, optional widgets, and windows
(Tasks, Projects, Customize, live agents) opened from the icons. Ported from
Electron Lazify's renderer (ticket 015); this records what changed on Chain.

## Behaviour

- **Under the clock**, a line says what is waiting on the user: agents waiting
  for input (opens the watch-or-leave choice the Agents icon offers) and tasks
  in progress (opens the Tasks window). It says nothing when neither is true.
- **Recent projects** — up to four, one click into the workbench. Ordered by
  when their workbench was last opened, then by when they were last synced, so
  the row is useful before any project has been opened on Chain.
- **Icons**: Tasks, Projects, Agents, New task, New workflow, Customize.
  Workspace and Settings were dropped: the sidebar and ⌘2 / ⌘, already go
  there. Agents stays — here it offers to watch a running agent in a window.
- Both the line and the row are hidden in focus mode.
- Tasks are fetched on open and again whenever the window regains focus,
  since agents and the workbench change them too. A failed fetch raises the
  app's failure toast instead of showing an empty list.
- The date widget follows the ticking clock, so it turns over at midnight.

## Source

- `src/features/home/pages/HomePage.tsx` — data, icons, recent ordering.
- `src/features/home/components/HomeAttention.tsx`, `RecentProjects.tsx`.
- `src/shared/hooks/use-recent-projects.ts` — the last five opened project
  paths, in `localStorage` under `lazify-recent-projects`, recorded by
  `src/routes/SyncedProjectRoute.tsx` when a workbench opens.
  `sortByRecentlyOpened` there also orders Workspace's "Recently opened" sort.

## Acceptance

Covered in `tests/features/home/home-desktop.test.ts`: the line's silence and
its task count, the refetch on focus, the failure toast, the New workflow
icon, and recent-project order and opening.
