# 016 — App shell, settings and Home (Phase 4 / In progress: zoom and keep-awake wait on Chain)

**Read this whole ticket before touching code.** Home's task list runs on
Chain storage, and theme and language persist. Zoom and keep-awake wait on
chain-sdk requests 08 and 09.

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
  `onZoomChanged`): sent as
  [request 08](../../chain-sdk-requests/08-page-zoom.md). Chain's webview
  has no page zoom, and CSS `zoom` throws off the terminal's measurements.
- **Keep awake** (`keepAwake`, `setKeepAwake`): sent as
  [request 09](../../chain-sdk-requests/09-keep-awake.md).
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
- [ ] Zoom (request 08) and keep awake (request 09)

## Correction made alongside

Porting the tasks test showed that Electron's `node:sqlite` enforces
foreign keys by default. Ticket 011 had said Electron never enforced them;
that ticket and the importer's comment are corrected.
