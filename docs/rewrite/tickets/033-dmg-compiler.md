# 033 — DMG compiler (Phase 6 / Done)

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

## Status — 2026-10-16

Done. The owner allowed Lazify to control Finder and built
`~/Downloads/Lazify-1.0.0.dmg` from the real app: UDZO, with
`Lazify.app`, the `Applications` symlink, `.VolumeIcon.icns`, and a
`.DS_Store` carrying Finder's icon positions and window view — the
window layout applied. The rest of this section is how it got there.
[Chain-sdk request 20](../chain-sdk-requests/20-apple-events-permission.md)
(an `appleEvents` key for chain-sdk's `chain.permissions` mechanism,
declaring `NSAppleEventsUsageDescription`) was filed and shipped the
same day. With the key added to this app's `package.json`, a full
live `compileDmg` run against a real `.app` (Calculator.app) now
**succeeds**: a genuine, valid `.dmg` — `ditto`'d bundle, the
`Applications` symlink, correctly compressed, mounted and detached
cleanly (confirmed by attaching it read-only afterward and listing
its contents).

Two real things came out of that first full run, not visible in any
of the earlier piecemeal checks:

- **A second bug, now fixed.** Writing the volume icon
  (`.VolumeIcon.icns`) failed with "outside every folder the app was
  granted" — `writeIcns()` (`images.ts`) wrote the file through
  `ditto`/`sips` via `process-runner` (unrestricted, correct), but
  then re-checked it existed with `pathExists()` from
  `@/platform/folders.ts`, which enforces the same grant boundary as
  every other `desktop.folders` call — and a freshly mounted DMG
  volume is never inside any grant the user picked. Swapped for
  `pathExistsOnDisk()` (`@/platform/exec.ts`, shell-based, already
  used elsewhere for exactly this "check outside every grant" need).
  Confirmed live afterward: the rebuilt `.dmg`'s volume icon file is
  present, right size, right permissions.
- **The Automation permission genuinely needs a human click — the
  Info.plist key alone isn't enough**, which is exactly what this
  ticket said from the start, now with hard evidence instead of an
  inconclusive symptom. With the key in place, the full compile no
  longer hangs or exits — it **succeeds**, with a precise warning:
  `"The window layout could not be applied, so the image opens as a
  plain folder. Allow Lazify to control Finder in System Settings ›
  Privacy & Security › Automation, then build again."` No TCC record
  for Lazify exists yet (checked `TCC.db` directly) — `chain inspect`
  drives the app headlessly, with nobody at the screen to click the
  system dialog the Info.plist key now makes possible, so the Apple
  Event fails closed rather than waiting. This is the literal
  "needs a person once" case, now isolated to exactly one click.

**What was left was only that click** (done 2026-10-16): open the real app (not through
`chain inspect`), build a DMG for any `.app` once, click "Allow" when
macOS asks whether Lazify can control Finder, and the window layout
(background, icon positions) should apply on the next build with no
further action. Everything up to and including a valid, working
installer image already works without it.

Everything below this reflects what was true before request 20 and
the `writeIcns` fix, plus the full live run above. No chain request
was needed for the parts that already worked from the start. Every
external tool
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
- `images.ts`'s `writeIcns()` checks its own output with
  `pathExistsOnDisk()` (`@/platform/exec.ts`), not `pathExists()`
  (`@/platform/folders.ts`) — found live (see Status) once the
  destination was a freshly mounted DMG volume, never inside any
  grant.

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
      a full `compileDmg` produced a real, valid `.dmg` — attached
      read-only afterward and listed: `Calculator.app`, the
      `Applications` symlink, and a correct, non-empty
      `.VolumeIcon.icns`. Only the Finder window layout didn't apply,
      with the exact warning naming the one remaining step (see Status)
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
- **Resolved**: the mount-through-convert half works — a real,
  attachable, correctly populated `.dmg` came out of a full live
  `compileDmg` run. Only the Finder window styling needs a person.
- **Resolved**: request 20 shipped `appleEvents`; the package.json key
  is in place. What's left is purely the human click this ticket
  always said it would need — confirmed, not assumed, by a live run
  that fails closed with no TCC record rather than hanging. Worth
  checking again against a signed, packaged `chain build` (not `chain
  dev`) once that's set up, in case a hardened-runtime build behaves
  differently from an unsigned dev run — not expected to, but not
  checked either.

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
- 2026-10-16, macOS 27.0.1 arm64: with chain-sdk request 20
  (`appleEvents` permission) shipped and the `package.json` key added,
  restarted `chain dev` and confirmed `.chain/native/Info.plist` and
  `Entitlements.plist` carried the right keys. `tccutil reset
  AppleEvents dev.chain.lazify-chain` found no existing record (no
  stale denial from the earlier attempts). A fresh `compileDmg` against
  a real Calculator.app: `success: true`, a real `.dmg` written. Hit a
  second bug live — `writeIcns`'s own existence check rejected with
  "outside every folder the app was granted" on the mounted volume's
  icon path; fixed (`pathExistsOnDisk` instead of `pathExists`) and
  reverified in the same session: rebuilt `.dmg` attached read-only and
  listed `Calculator.app`, `Applications` (symlink) and a real,
  correctly sized `.VolumeIcon.icns`. The window-layout step itself
  reported `"Allow Lazify to control Finder in System Settings ›
  Privacy & Security › Automation, then build again"` — `TCC.db` still
  had no record for the app afterward, confirming the Apple Event
  failed closed with nobody at the screen to click the prompt, rather
  than the call hanging as it had before request 20. `CI=true npm
  test`, `npm run typecheck`, `npm run build:web` all pass with the
  `writeIcns` fix. Scratch files, the mounted volume and the `chain
  dev` process cleaned up afterward.
- 2026-10-16, later: the owner gave the Finder Automation grant in the
  real app and built `Lazify-1.0.0.dmg` (122 MB). Attached read-only:
  UDZO, `Lazify.app`, `Applications` symlink, `.VolumeIcon.icns`, and a
  `.DS_Store` holding Finder's icon-location and window-view records —
  the styling step ran. Detached cleanly.
