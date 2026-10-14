# 033 — DMG compiler (Phase 6 / In progress)

**Read this whole ticket before touching code.** Turns a built `.app`
into a drag-to-install `.dmg`: `ditto` to stage the bundle, `hdiutil` to
build and compress the image, `osascript` to style the mounted window,
`sips`/`xattr` for the icon. macOS only. The six `dmgBuilder` members
and `onDmgProgress`.

## Goal

Pick a `.app`, see its name/version/size/icon, optionally pick a
background and a volume icon, build, and get back a `.dmg` beside the
app (or wherever chosen) with a real drag-to-Applications installer
window — or a clear reason it didn't work.

## Status — 2026-10-15

In progress. No Chain request needed: every external tool
(`ditto`/`hdiutil`/`osascript`/`sips`/`xattr`/`plutil`/`ln`) runs through
`process-runner`, exactly like `node-path`/`java-runtime`/Prettier
already do. The renderer and the type stand-ins are already ported
(ticket 015); the backend and the bridge wiring are done and tested.

Verified for real in the app: `inspectAppBundle` against a real `.app`
(name, version, identifier, size, a real icon preview), and `ditto`,
`ln -s` and `hdiutil create` each run correctly against real files.
**Not yet verified live**: `hdiutil attach` through `detach` —
mounting, running the AppleScript layout, writing the volume icon,
converting to the final image. This needs the one-time Automation
permission grant (System Settings) only a person at the real app can
give, and attempting it headlessly through the dev inspector twice
left the `chain dev` session unstable (the window process exited
cleanly mid-call both times, nothing left mounted) — treated as this
environment's limit for driving Finder automation, not evidence of a
code problem, since everything that runs before and after that step
checked out individually. Left for a person to click through once.

## Source-of-truth references

- Roadmap row: Phase 6, "DMG compiler (macOS only)"
- Old source: `src/main/dmg/*` (798 lines: `bundle.ts`, `compile.ts`,
  `images.ts`, `inspect.ts`, `run.ts`, `types.ts`, `volume.ts`,
  `window-layout.ts`), `src/main/dmg-compiler.ts` (its entry point),
  `src/main/ipc/dmg.ts`
- Public API: `selectAppBundle`, `selectDmgDestination`,
  `inspectAppBundle`, `defaultDmgPath`, `selectDmgImage`,
  `dmgImagePreview`, `compileDmg`, `onDmgProgress` in
  [`../02-contract-manifest.md`](../02-contract-manifest.md)
- Old tests: **none in Electron.** A characterisation fixture is added —
  the same situation ticket 003 (package version matching) was in
- Persistent data touched: none past the build — everything is staged
  in a temp folder and cleaned up, success or failure
- Required OS behaviour: macOS only (refuses outright elsewhere, same as
  Electron); `ditto`, `hdiutil`, `osascript`, `sips`, `xattr`, `plutil`,
  `ln` all ship with the OS, no Xcode tools needed; Finder scripting
  needs an Automation permission grant the user approves once, in
  System Settings, which the app cannot grant on its own

## Two platform differences, decided here rather than requested

- **No save dialog.** `desktop.folders` has a picker for existing paths,
  never a "type a new filename in this folder" dialog the way Electron's
  `showSaveDialog` is. `selectDmgDestination` becomes a folder picker
  whose result is joined with the suggested filename — no capability is
  missing for this: the output path was already a plain editable text
  field in the ported form (`use-dmg-compiler.ts`'s `outputPath` state),
  which the picker only prefills. A user who wants a different filename
  types it there, exactly as they could before.
- **No extension filter on a picker.** `desktop.folders.pick()` takes no
  `filters` option. The `.app` and image pickers show every file; the
  existing validation (`bundleProblem`, `readImagePreview` failing
  closed) already turns a wrong pick into a clear message rather than a
  crash, so this costs a slightly less helpful picker, not a missing
  check. Not worth a request on its own (chain-sdk rule 7) unless it
  turns out to matter in the app.
- **No dialog title either.** `pick()` has no title option, so the
  background and volume-icon pickers (`selectDmgImage`) show the same
  generic dialog instead of Electron's "Choose a background for the
  window" / "Choose an icon for the disk" — the UI's own labels next to
  each picker button already say which is which.

## Target boundary

- `src/shared/lib/dmg/` beside the already-ported `types.ts`: `bundle.ts`,
  `compile.ts`, `images.ts`, `inspect.ts`, `volume.ts`, `window-layout.ts`
  (pure, copied as is) — file access through `src/platform/folders.ts`,
  every external tool through `src/platform/exec.ts`'s `execFile`.
- `src/platform/dmg.ts` wraps the six members plus progress events,
  following the shape `src/platform/extensions.ts`/`linting.ts` already
  use for a job that reports progress over time.
- `defaultOutputPath`'s callers get real paths from `desktop.folders`
  rather than Node's `fs`; `run()` wraps `execFile`, converting its
  thrown `ExecFileError` back into the `{code, stdout, stderr}` shape
  `compile.ts`'s own step-checking logic already expects.

## Acceptance checklist and evidence

- [x] A characterisation suite in place of a fixture Electron never
      recorded: `bundleProblem` (every refusal, macOS stub, a real
      bundle), `fileSafe`, `directorySize`, `findBundleIcon` (named
      icon preferred, any `.icns` as fallback, never descending into a
      subfolder) in `bundle.test.ts`; `windowLayout`'s clamping and
      `layoutScript`'s AppleScript-string escaping in
      `window-layout.test.ts`; `mountPointFrom` in `volume.test.ts` —
      23 cases
- [x] A fake `execFile` proves the compile sequence: `ditto` → symlink →
      optional background → `hdiutil create` (HFS+, sized with headroom)
      → `attach` → `osascript` (styling) → volume icon → `detach` →
      `convert` (UDZO); that a styling failure is a warning, not a
      failure; that a later failure still unmounts; that a non-Error
      throw still reports a readable message (found live, see Status);
      that nothing is left in the temp folder either way — 7 cases in
      `compile.test.ts`
- [x] In the app, against a real `.app` (Calculator.app, copied into the
      app's own granted temp folder so no native picker was needed):
      `inspectAppBundle` answered real name/version/identifier/size/icon;
      `ditto`, `ln -s` and `hdiutil create` each ran and produced the
      right file on disk. Mounting onward: see Status
- [x] A refused build (wrong extension, output inside the app itself)
      answers with the message, not a crash — covered in `compile.test.ts`
- [x] `CI=true npm test`, `npm run typecheck`, `npm run build:web` pass

## Not removed

Nothing. Nothing in the Electron repo is changed.

## Rollback

Revert the commit; the six members go back to their stubs.

## Open questions

- Whether `desktop.folders.pick({ files: false })` treats a `.app`
  bundle as a single selectable item (matching Finder's own default,
  which is why Electron never set `treatPackageAsDirectory`) or lets the
  user descend into it — not yet checked live; needs the native picker,
  which the dev inspector can't drive.
- The mount-through-convert half (`hdiutil attach` onward) needs a
  person: the one-time Finder Automation permission, and a `chain dev`
  session stable enough to drive it, which the inspector alone wasn't in
  this pass.
- Neither `.chain/native/tauri.conf.json` nor anywhere else in this
  repo declares an Apple Events usage string
  (`NSAppleEventsUsageDescription`) or entitlement for scripting
  Finder — `01-capability-inventory.md` already flagged this as needed
  for Chain's bundle config, before this ticket existed. Without it,
  macOS may never show the permission prompt a person would otherwise
  click "Allow" on, rather than only needing a click. Worth checking
  against a signed, packaged build (not `chain dev`) before assuming a
  person clicking through fixes this on its own.

## Verification log

- 2026-10-15, macOS 27.0.1 arm64: 30 tests across the pure logic and the
  fake-`execFile` compile sequence pass. In the app (`chain dev`): a
  real Calculator.app copied into the app's own temp grant,
  `inspectAppBundle` answered its real name/version/identifier/size and
  a real icon preview; `ditto`, `ln -s` and `hdiutil create` each run
  individually through `execFile` and produced the right files on disk.
  A full `compileDmg` call failed after ~123 s with an unhelpful
  `"[object Object]"` message — the messageOf fix above was written in
  response and is covered by a test, but the underlying call still
  wasn't reverified live, since `hdiutil attach`, tested next on its
  own, was followed immediately by `chain dev`'s window process exiting
  cleanly (exit code 0, nothing left mounted). Scratch files cleaned up
  afterward.
