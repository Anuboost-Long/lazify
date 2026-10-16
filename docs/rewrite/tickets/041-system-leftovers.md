# 041 — Upload picker, dropped apps, pasted images, restart (Phase 6 / Done)

**Read this whole ticket before touching code.** The four `system`
bridge members still rejecting with "isn't available in Lazify Chain
yet", none of them needing a new Chain capability.

## Goal

Every bridge member outside the browser (request 18) and the updater
(Phase 7) is real: attach a file to an API Studio form body, drop an
`.app` on the DMG page, paste a screenshot into an agent terminal as a
path, and restart after installing nvm.

## Status — 2026-10-16

Done. All four are wired; no chain-sdk request was needed.

| Member | Electron | Chain |
| --- | --- | --- |
| `chooseUploadFile` | `dialog.showOpenDialog({ openFile })` | `desktop.folders.pick({ files: true })` — the pick is a grant, so the request's multipart read of the path works |
| `pathForDroppedFile` | `webUtils.getPathForFile(file)`, `""` when there is no path | Always `""`. The DMG page subscribes to `desktop.folders.onDrop` instead (below) |
| `saveClipboardImage` | `clipboard.readImage()` → `mkdtemp`/`screenshot.png`, null without an image | `osascript` through `process-runner` writes `the clipboard as «class PNGf»` to `<app temp>/lazify-paste-<id>/screenshot.png`; AppleScript's `-1700` means no image → null, folder removed |
| `relaunchApp` | `app.relaunch(); app.exit(0)` | `location.reload()` — see "Different by design" |

**Dropped files.** wry's macOS drop handler (`wkwebview/drag_drop.rs`)
consumes every drop when Tauri's drag-drop handling is on (the default)
and never calls the webview's own, so the DOM `drop` event the DMG page
listened for cannot fire under Chain. `useDmgCompiler` now subscribes
through `onAppDropped` (`@/platform/dmg`) while no build runs — the page's
old `!building` guard — and the native subscription exists only while
the DMG page is mounted, so drops elsewhere grant nothing. The page's
hover highlight (`onDragOver`/`onDragLeave`) is left as ported; it
stays inert because Chain reports only the drop, not enter/leave.

**Pasted images also fixed text paste.** `attachClipboardPaste` calls
`saveClipboardImage()` first and only reads text in its `.then`; with
the stub rejecting, Cmd+V in a Chain terminal pasted nothing at all.

## Source-of-truth references

- Old source: `src/preload/api/system.ts`, `src/main/agents/clipboard-image.ts`,
  `src/main/ipc/api-studio.ts` (`lazify:choose-upload-file`),
  `src/main/ipc/environment.ts` (`lazify:relaunch`)
- Callers: `FormBodyRows.tsx`, `use-dmg-compiler.ts`,
  `shared/terminal/clipboard-paste.ts`, `NodeVersionModal.tsx`
- Required OS behaviour: macOS's pasteboard converts TIFF-only images to
  PNG for `«class PNGf»` (checked on 27.0.1 with a TIFF-only clipboard)

## Different by design

- **Restart is a reload.** Electron restarts so a freshly installed nvm
  reaches its main process's PATH. Here every tool runs through a new
  login shell (`loginShell`), and the tool scan's cache lives in the page,
  so a reload re-runs everything a restart would. Running terminals and
  agents survive it, where Electron's restart killed them. A real process
  restart can be requested from Chain if updates (Phase 7) need one.

## Acceptance checklist and evidence

- [x] `tests/platform/system.test.ts`: an image is saved as
      `screenshot.png` in its own temp folder with the path passed as an
      `osascript` argument (no escaping); no image answers null and leaves
      nothing behind; any other failure is reported, also leaving nothing
- [x] `tests/platform/lazify.test.ts`: `pathForDroppedFile` answers `""`
- [x] In the app (`chain inspect --eval`): with a PNG copied,
      `saveClipboardImage()` returned a real 32×32 PNG under the app's temp
      folder; with text copied, null and no folder left
- [x] `CI=true npm test`, `npm run typecheck`, `npm run build:web` pass
- [ ] A person: drop an `.app` on the DMG page, attach a file in an API
      Studio form body, paste a screenshot into an agent terminal, press
      "Restart" after installing nvm. The inspector can drive neither a
      native picker nor a Finder drag

## Not removed

Nothing. Nothing in the Electron repo is changed.

## Rollback

Revert the commit; the four members go back to their stubs and the DMG
hook back to the DOM drop.

## Verification log

- 2026-10-16, macOS 27.0.1 arm64: `osascript` PNG and TIFF-only clipboard
  reads checked from a shell; both live `saveClipboardImage` runs above in
  `chain dev`. Test files and the clipboard cleaned up afterward.
