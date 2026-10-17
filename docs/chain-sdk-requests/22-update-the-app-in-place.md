# Capability Request 22 — Update the app in place

Source: the Lazify rewrite to Chain, decision D-4 (auto-update is in the
first release) and D-6 (builds stay ad-hoc signed for now), 2026-10-17.

**Not part of this request:**
- Downloading or installing on its own. Every step is the user's click,
  as in Electron (below).
- Windows and Linux. The first Chain release is macOS-only (D-2).
- Delta updates, release channels (beta/stable), staged rollouts.
- Moving Electron Lazify users onto the Chain app. That's a separate
  release step, not something the updater does.
- Hosting the feed. Lazify's owner publishes releases; Chain only has
  to read them.

## Why this needs a change in Chain

Chain has no way for a built app to replace itself. Nothing in
`agent-docs/capabilities/` covers it:
- `packages` downloads and unpacks a package into a folder the app owns.
  It can't swap the running app's own bundle and relaunch.
- `process-runner` could run a script that does the swap, but that means
  Lazify rewriting the bundle by hand from outside Chain's rules.
- `chain build` produces the app and its DMG, but nothing a running app
  could fetch and apply.

Electron Lazify has this today in `src/main/updater.ts`
(`electron-updater`), exposed to the page as five bridge members:
`getUpdateState`, `checkForUpdates`, `downloadUpdate`,
`quitAndInstallUpdate`, `onUpdateStateChanged`. They're stubs in
Lazify Chain (`src/platform/lazify.ts`), and Settings' "Check for
updates" is the only place they're used.

On macOS, Electron's updater has never worked in practice: Squirrel.Mac
refuses to install an update into an app not signed with a Developer ID
certificate, and Electron Lazify ships ad-hoc signed (`identity: null`
in `electron-builder.mac.yml`). The owner has decided Chain builds stay
ad-hoc signed until they buy an Apple Developer membership, and that
the first release updates itself anyway. So **the update has to install
into an ad-hoc signed app**. That's the main thing this asks for that
Electron couldn't do.

## What Lazify needs

1. **Check.** Ask a feed whether a newer version than the running one
   exists. The answer includes its version, release date and release
   notes when the feed has them. Checking must never download the
   update.
2. **Download.** Fetch the update only when asked, reporting progress
   (bytes so far, total) while it runs. Agents may be mid-run, so the
   user decides when to spend the bandwidth.
3. **Install and relaunch.** Replace the app with the downloaded
   version and start it again, only when asked. Lazify warns the user
   first that terminals and running agents stop. If the user quits on
   their own after a download instead, the update should still apply,
   as Electron's `autoInstallOnAppQuit` does.
4. **Say when updating isn't possible** rather than fail: a `chain dev`
   run (nothing to replace), or an app the current user can't write to
   (say, installed by another account into `/Applications`).
5. **Errors** carry a message Lazify can show: no network, feed
   unreachable, the download doesn't verify, not enough disk space.
6. **Integrity without Apple's signature.** An update must be proved to
   come from Lazify's owner before it's installed, using something that
   works on ad-hoc signed builds. How that's done is Chain's call. The
   same mechanism must keep working once the owner signs with a
   Developer ID later, with no change in Lazify beyond configuration.
7. **The feed is configured by the app**: a public HTTPS address that
   is read anonymously, as Electron's is (a public GitHub releases repo,
   so no token ships in the app).
8. **`chain build` produces what the feed serves**: the update artifact
   and whatever the feed needs to describe it, so a release is "build,
   then upload these files". Whatever key material the integrity check
   uses stays out of the app's repo.

## Questions for Chain to answer in the contract

Ad-hoc signing gives every build a new identity. macOS may treat an
updated app as a different app. Please verify and document what
happens after an update to:
- permissions already granted: microphone, Apple Events (request 20),
  Files and Folders;
- folders the user already chose (request 01), if access to them
  depends on the app's identity;
- whether the updated app opens without a new "unidentified developer"
  prompt.

If any of these are lost on every update, Lazify needs to know before
shipping, to tell users what to expect.

## How Lazify will use it

`src/platform/updates.ts` maps the capability onto Electron's
`UpdateState` (`idle`, `unsupported`, `checking`, `current`,
`available`, `downloading`, `downloaded`, `error`), and
`src/platform/lazify.ts` replaces the five stubs. The Settings screen
already ported from Electron then works unchanged.

## macOS / Windows

- **macOS**: required for the first release, ad-hoc signed.
- **Windows**: not needed until Chain ships there (D-2). Electron's
  updater works unsigned on Windows, so the same requirement shouldn't
  be harder there. Not verified.
