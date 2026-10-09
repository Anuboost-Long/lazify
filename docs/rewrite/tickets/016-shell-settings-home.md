# 016 — App shell, settings and Home (Phase 4 / Done)

**Read this whole ticket before touching code.** Home's task list runs on
Chain storage, theme and language persist, and zoom and keep-awake run on
Chain's `pageZoom` and `keepAwake` (requests 08 and 09, shipped the same
day).

## Status — 2026-10-09

- **Tasks** (`tasks` preload group, 12 of 13 members): Electron's
  `task-store.ts`, `status-events.ts` and `run-store.ts` ported to
  `src/shared/lib/tasks/` on Chain storage, exposed by
  `src/platform/tasks.ts` and wired into the bridge. Same SQL, row mapping
  and comments; the calls are async (`query`, `execute`, `rowsAffected`,
  `lastInsertId`) and ids come from Web Crypto. `setTaskStatus` keeps the
  preload's default `source = "manual"`. `buildTaskPrompt` waits on the
  Prompt Builder's storage (ticket 019).
- **Theme and language** are the renderer's own `localStorage` keys
  (`lazify-theme`, `lazify-language`) and need no porting.
- **Zoom** (`readZoom`, `setZoom`, `stepZoom`, `resetZoom`,
  `onZoomChanged`): `src/platform/zoom.ts` ports Electron's
  `window-zoom.ts` (the same steps 0.5–2, clamping and `window-zoom.json`
  format, in the app's data folder) onto `desktop.pageZoom`
  ([request 08](../../chain-sdk-requests/08-page-zoom.md)). `main.tsx`
  applies the stored zoom before the first render. Electron also stepped
  zoom from the View menu and trackpad pinch; Chain has no app menu yet and
  WebKit's pinch is visual only, so only Settings and the keyboard step it.
- **Keep awake** (`keepAwake`, `setKeepAwake`): `src/platform/keep-awake.ts`
  ports `AwakeGuard` and `keep-awake.json` (on unless turned off) onto
  `desktop.keepAwake` ([request 09](../../chain-sdk-requests/09-keep-awake.md)),
  fed by the attention detector's busy signal as in Electron's `main.ts`.
- **Updater** stays a stub until Phase 7 (D-6).

## Acceptance checklist and evidence

- [x] Electron's `tests/main/tasks.test.ts` passes on the port (19 tests;
      the two prompt-building tests come with ticket 019), with only `await`
      added and Node's SQLite behind the storage facade
- [x] `CI=true npm test` passes (280 tests); typecheck passes
- [x] Real app: a task created through the bridge was stored, moved to
      "doing" with its history recorded (`doing:manual`), shown in Home's
      Tasks window opened from the dock, and deleted
- [x] Real app: theme "light" and language Khmer survive a page reload (the
      sidebar renders in Khmer); both restored afterwards
- [ ] Theme and language survive a full app restart (needs `chain dev`
      restarted)
- [x] Headless tests (`tests/platform/zoom-keep-awake.test.ts`): zoom
      steps and ends, clamping, Electron's file format, page and listeners,
      startup zoom; keep awake on by default, one assertion while any agent
      is busy, the switch honoured mid-run
- [x] Real app, zoom: page width 2016 / 1008 / 1512 CSS px and pixel ratio
      1.5 / 3 / 2 at 75% / 150% / 100%; back at 100%. xterm uses its DOM
      renderer here, which stays sharp at any zoom; its device-pixel cell
      size doesn't update with the ratio, which would matter only if a
      canvas or WebGL renderer were added
- [x] Real app, keep awake: a test agent printing Claude-style "working"
      output made `pmset -g assertions` list
      `PreventUserIdleDisplaySleep named: "Lazify: an agent is working"` for
      the Chain app; stopping the agent released it

## Correction made alongside

Porting the tasks test showed that Electron's `node:sqlite` enforces
foreign keys by default. Ticket 011 had said Electron never enforced them;
that ticket and the importer's comment are corrected.
