# 031 — Diagnostics (Phase 6 / Done)

**Read this whole ticket before touching code.** The local log file a bug
report is read from, and what happens when the app hits an error it can't
recover from. Not a 1:1 port: Electron's main/renderer split, native crash
reporter, OS signal handling and native dialogs have no equivalent in a
single-webview Chain app, and this ticket says plainly which parts of
`src/main/diagnostics/*` carry over and which don't, rather than forcing a
shape that doesn't fit.

## Goal

A local, human-readable log file Lazify writes its own errors to, so a bug
report is "read the log" rather than "reproduce it for me". A JS error or a
rejected promise nothing caught is written down and shown as a plain
in-app screen with a way to reload, rather than left as a silently broken
window.

## Status — 2026-10-15

Done. No Chain request needed — everything portable is app code over
`desktop.folders`, and the rest (below) isn't something app code in a
single-webview architecture can do at all, or is already handled
natively.

## Source-of-truth references

- Roadmap row: Phase 6, "diagnostic runs" (log file and fatal-error half;
  extension/scan diagnostics are tickets 029 and 030)
- Old source: `src/main/diagnostics/logger.ts` (133 lines),
  `src/main/diagnostics/crash-handlers.ts` (195 lines), wired in
  `src/main/main.ts`
- Public API: none in `02-contract-manifest.md` — diagnostics has no
  preload surface in Electron either; it is called from `main.ts` only
- Old tests: `tests/main/logger.test.ts` (8 cases),
  `tests/main/crash-handlers.test.ts` (partial port, see below)
- Persistent data touched: a log file, previously
  `~/Library/Logs/Lazify/lazify.log`; now
  `<app data>/logs/lazify.log` (below)
- Required OS behaviour: none beyond `desktop.folders`

## What carries over, and what doesn't

| Electron | Chain |
| --- | --- |
| `logger.ts`: level, scope, message, rotation at 2 MB, one generation, non-`Error` detail stringified | **Ported as is**, over `desktop.folders` instead of synchronous `fs` |
| Also written to `console.error`/`console.log`, with EPIPE/stream-destroyed guards for a closed terminal | **Simplified to a plain `console.error`/`console.log`.** A webview's devtools console has no "the terminal that launched it closed" failure mode — that guard existed for Electron's main process inheriting a real OS pipe, which doesn't apply here |
| `process.on("uncaughtException")` → `handleFatalError`; `process.on("unhandledRejection")` → logged only, deliberately not fatal | **Ported with the same split**: `window.addEventListener("error")` shows the fatal screen; `"unhandledrejection"` only logs. Found live in the app: an unported feature's rejected promise is exactly the "not fatal" case this distinction exists for — treating it as fatal would turn every unported stub into a crash |
| A native `dialog.showMessageBoxSync` modal, parented to the window, offering Quit / Show log | **An in-app screen** (`FatalErrorScreen`), since there's no native message-box capability and no separate process to keep running under it. "Show log" shows the path as selectable text rather than revealing it in Finder — no reveal-in-folder primitive exists today, and it's too small a convenience to request on its own (chain-sdk rule 7) |
| `app.quit()` with a 3 s forced `app.exit(1)`, so `will-quit` cleanup runs before the process ends | **Not ported.** There's no app-controlled "process" to quit independently of the OS window, and nothing here needs that grace: `process-runner`'s own contract already kills every process it started when the app quits however it quits, which was the actual problem this was guarding — not something app code has to replicate |
| `render-process-gone` / `unresponsive` / `responsive` on the window's `webContents`, from the main process watching the renderer from outside | **Not portable.** There is no outside process here; app code can't watch its own death, the same reason Electron did this from main rather than from the renderer it's about. A hang shows as a frozen window, same as it would anywhere else with no separate watcher |
| `crashReporter.start({ uploadToServer: false })`, local minidumps | **Not requested.** Native crash-dump capture is Tauri/Rust's own domain, not reachable from app code without a new native capability, and nothing today has actually needed one — see chain-sdk's rule 7 (built on a real requirement, not speculatively). Left as an open question below, not a request |
| `SIGHUP`/`SIGINT`/`SIGTERM` handlers, so closing the terminal or `kill` still runs cleanup | **Not portable, and not needed.** A webview can't receive OS signals sent to the native process. The cleanup those existed for (orphaned language servers, etc.) is `process-runner`'s own guarantee now, same as the `app.exit` row above |

## Target boundary

- `src/shared/lib/diagnostics/logger.ts`: `log`/`logInfo`/`logWarn`/`logError`,
  `getLogFilePath()`, `getDiagnosticsPaths()`, same rotation and formatting,
  file access through `src/platform/folders.ts`.
- `src/shared/lib/diagnostics/global-errors.ts`: `installGlobalErrorLogging()`,
  wired from `src/main.tsx` before the app renders; logs an uncaught error or
  rejection and calls a callback the app shell uses to show the fatal screen.
- `src/app/components/FatalErrorScreen.tsx`, mounted in `App.tsx` above the
  router, shown once and never cleared without a reload (mirrors "does not
  prompt twice").
- `src/platform/diagnostics.ts` wires `getDiagnosticsPaths` into the
  bridge; Settings' already-ported `DiagnosticsSection.tsx` (ticket 015)
  now gets a real answer instead of the rejection it showed before.
  `revealInFileManager` and `openExternalUrl`, which that screen also
  calls, were already implemented when the renderer was ported (ticket
  015) — only the one missing member, `getDiagnosticsPaths`, was wired
  here. Its one factual leftover from the port, an
  `Electron ${paths.electronVersion}` clause in the bug-report template
  (there is no such field, and never was one here), is dropped.

## Acceptance checklist and evidence

- [x] Electron's `logger.test.ts` ported: directory created on first write,
      an error's stack kept, a non-`Error` detail stringified, rotation at
      the cap, never throws when the log can't be written, paths reported
      for a bug report. The two console/pipe-guard cases are dropped (see
      table) and replaced with one case for the simplified console write
- [x] A new case for `global-errors.ts`: an uncaught error shows the fatal
      screen and is logged; a second one while it is showing is logged but
      not shown again; an unhandled rejection is logged and never shown
- [x] In the app (`chain inspect --eval`): a real unhandled rejection from
      an unported feature's stub (`usePictureInPicture`'s mount call) was
      logged and did **not** show the fatal screen — the first run showed
      it did, a bug this ticket's own verification pass caught and fixed
      (see Verification log); a real uncaught error showed the fatal
      screen and was logged with its text; reload recovered the app
- [x] In the app: `getDiagnosticsPaths()` answers for real (log file,
      log directory, version, platform, arch); Settings' Diagnostics
      section, previously rejecting, now shows the real log path
- [x] `CI=true npm test`, `npm run typecheck`, `npm run build:web` pass

## Not removed

Nothing. Nothing in the Electron repo is changed.

## Rollback

Revert the commit. Nothing else depends on this; the app simply stops
logging and stops showing the fatal screen.

## Open questions

- Native crash-dump capture, if Lazify ever needs one badly enough to ask
  for it: would be its own chain-sdk request, scoped to "write a local
  minidump on a native crash", not folded into this ticket.
- Whether Tauri's own webview already recovers from a renderer crash (reloads
  on its own) or leaves a blank window — not seen in the app yet, since
  nothing has crashed the webview itself during this pass.

## Verification log

- 2026-10-15, macOS 27.0.1 arm64: Electron's logger cases pass on the copy.
  First app run treated `unhandledrejection` the same as `error` — every
  page that calls an unported member without a `.catch` (the browser's
  `useLazyShield`, `usePictureInPicture`) rejects at mount, and the fatal
  screen showed immediately on launch over something nobody actually
  needed recovering from. Fixed to match Electron's own split
  (`uncaughtException` fatal, `unhandledRejection` logged only) and
  re-verified: real unported-feature rejections now only log; a real
  thrown error (`chain inspect --eval`) showed the fatal screen, logged
  its text to `<app data>/app/logs/lazify.log` on disk, and reload
  recovered the app with the screen gone. `getDiagnosticsPaths()` called
  through the real bridge answered the real log path, version `0.1.0`,
  `macos`/`arm64`.
