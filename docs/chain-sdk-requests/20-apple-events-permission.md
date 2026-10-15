# Capability Request 20 — An `appleEvents` app permission

Source: the Lazify rewrite to Chain, ticket 033 (DMG compiler), 2026-10-16.

**Not part of this request:**
- Driving Finder itself — Lazify already does that through
  `process-runner`'s `osascript` (same as every other external tool
  this ticket uses). This is only about the one-time permission
  prompt that scripting makes macOS show.
- App Sandbox. Lazify isn't sandboxed; this is the plain
  Automation/TCC prompt a non-sandboxed app still needs to send Apple
  Events to another app.

## Why this needs a change in Chain

Lazify's DMG compiler (ticket 033) runs `osascript` to style a mounted
disk image's Finder window — the same "set the view, place icons,
show the background" script Electron's own `window-layout.ts` always
ran, unchanged, through `process-runner`'s `execFile`. The first time
an app sends Apple Events to Finder, macOS shows a one-time Automation
permission prompt — *if* the app declares why, with
`NSAppleEventsUsageDescription` in its `Info.plist`. Without that key,
some macOS versions never show the prompt at all; the Apple Event is
just silently refused.

`chain-sdk`'s `syncPermissions()` (`packages/cli/src/permissions.ts`)
already has exactly this mechanism — a `package.json` `"chain":
{"permissions": {...}}` declaration synced into
`.chain/native/Info.plist` (and an entitlements file, for
`microphone`) on every `chain dev`/`chain build` — but `PLIST_KEYS`
only knows `microphone`, `speechRecognition` and `systemAudio`. There
is no `appleEvents` key, so Lazify has no sanctioned way to add
`NSAppleEventsUsageDescription` without hand-editing
`.chain/native/Info.plist`, which `.chain/native/` being framework-owned
(this repo's own `AGENTS.md`) already rules out, and which
`syncGeneratedFile()` would overwrite anyway — any manual edit's
intent is to never survive the next `chain dev`.

This was already flagged as needed in this rewrite's own
`01-capability-inventory.md`, before ticket 033 existed; this request
is that flag acted on. It's also likely why ticket 033's live
`hdiutil attach`→`osascript` pass never got to show a result: nothing
in this repo declares the key, and the `chain dev` window process
exited mid-call both times it was tried, rather than showing a
prompt to click through.

## What Lazify needs

- An `appleEvents` key in `AppPermissions`/`PLIST_KEYS`, writing
  `NSAppleEventsUsageDescription` into `.chain/native/Info.plist` —
  same mechanism `microphone`/`speechRecognition`/`systemAudio`
  already use, so:

  ```json
  "chain": {
    "permissions": {
      "appleEvents": "Styles the Finder window a built .dmg mounts in."
    }
  }
  ```

- Whether this also needs an entitlement
  (`com.apple.security.automation.apple-events`, the Apple Events
  analogue of `microphone`'s `com.apple.security.device.audio-input`)
  is Chain's call — it matters once Lazify is signed with the
  hardened runtime (`chain build`, not `chain dev`), not for an
  unsigned dev run. If it's needed, the same `syncGeneratedFile()`
  pattern already used for the microphone entitlement covers it.

## How Lazify will use it

Add the key above to this app's `package.json`. No code change in
this repo otherwise — `osascript` already runs through
`process-runner`, waiting only on the OS actually offering the
permission to grant.

## macOS / Windows

macOS only — `NSAppleEventsUsageDescription` and Apple Events are a
macOS concept; this key would simply never apply on Windows/Linux,
same as `microphone` already doesn't gate anything there. Not yet
verified live with the key in place (that's the next step once this
ships) — ticket 033's own log already shows what happens *without*
it: two attempts at `hdiutil attach`→`osascript`, no prompt seen
either time, the window process exiting mid-call both times.
