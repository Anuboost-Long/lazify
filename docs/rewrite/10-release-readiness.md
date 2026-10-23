# 10 — Release readiness

Roadmap Phase 7: what stands between this repo and a first Chain release
users can install, update and leave. Written 2026-10-17.

**Exit criterion (roadmap):** installers update a prior release without
data loss, and release validation is reproducible in CI. Signing is
ad-hoc for now (D-6), so "signed" means Chain's update signature, not
Apple's.

## Decided

| ID | Decision |
| --- | --- |
| D-2 | macOS only. Windows and Linux users stay on Electron |
| D-4 | The first release updates itself (check, download, install, each on the user's click) |
| D-6 | Ad-hoc signed, as Electron is. Developer ID and notarisation come when the owner buys the Apple Developer membership |
| D-9 | The app is called "Lazify" (2026-10-21). The Electron build is deprecated once this one proves faster, so installing it replacing Electron's `Lazify.app` is accepted; going back means reinstalling Electron's `.dmg` |

## Before the first release

### Owner decisions

1. **The app's identifier and version.** The name is decided (D-9); the
   scaffold's identifier is still in place: `dev.chain.lazify-chain`,
   version 0.1.0 (`package.json`: `chain.app.identifier`, `version`).
   - The identifier names the data folder
     (`~/Library/Application Support/<identifier>/app`), so it must be
     final before anyone installs: changing it later leaves every user's
     data behind. It must also differ from Electron's `com.lazify.desktop`
     so both apps can be installed at once (`09-rollback-and-recovery.md`).
   - The version: Electron is at 1.0.0. The feeds are separate, so the
     Chain app can start anywhere, but a user comparing versions will read
     them as one product.
2. **Where the update feed lives** (D-6's remainder). Not Electron's
   `lazify-dist` releases, whose `Lazify-arm64.zip` the Chain feed must not
   be confused with. A new public repo is simplest: the app reads it
   anonymously.
3. **The update signing key.** Request 22 signs updates with a key only
   the owner holds; the app carries the public half. Generate it once
   (`chain updates key <file>`, outside this repo), store the private half
   somewhere safe (a password manager or a CI secret), and never lose it:
   an app can only accept updates signed with the key it shipped with.
4. **A self-signed code-signing certificate, or not.** chain-sdk verified
   that ad-hoc builds lose microphone, Apple Events and Files and Folders
   access on every update: macOS asks again each time. Signing every
   build with one self-signed certificate (Keychain Access, "Code
   Signing", no Apple membership; `CHAIN_SIGNING_IDENTITY` for
   `chain build`) keeps them. Like the key, it must be kept and backed up:
   a new certificate asks for every permission once more. chain-sdk
   recommends it from the first release. Moving to it later, or to a
   Developer ID, costs one round of prompts after that update.

### Waiting on chain-sdk

- [Request 22](../chain-sdk-requests/22-update-the-app-in-place.md),
  `desktop.updates`: shipped and verified by chain-sdk 2026-10-17, ported
  in [ticket 044](tickets/044-updates.md). Left: an https feed, a
  universal build and a first launch from a quarantined download, which
  chain-sdk hasn't tried, and a real update between two Lazify builds.
- [Request 23](../chain-sdk-requests/23-floating-page-window.md), the
  floating page window: built in chain-sdk's working tree and ported in
  [ticket 045](tickets/045-page-window.md). Left: chain-sdk committing it,
  so the release's pinned chain-sdk commit has it.

### Lazify work

- **Pin chain-sdk.** `@chain/sdk` and `@chain/cli` are `file:../chain-sdk`,
  and several capabilities shipped in chain-sdk's working tree. A release
  is built from a recorded chain-sdk commit, and the release notes name it.
- **Release CI.** `.github/workflows/chain-release.yml` runs on a
  `chain-v*` tag (Electron's `release.yml` in the same GitHub repo owns
  `v*`) or by hand. On a macOS runner it checks out chain-sdk at
  `CHAIN_SDK_REF` next to this repo, runs `CI=true npm test` and
  `npm run typecheck`, then `npm run build:mac` (`chain build --target
  macos-all`: arm64, x64 and universal apps in `release/macos-<arch>/`),
  and keeps the three DMGs and `release-updates/` as workflow artifacts. Left: uploading the update
  files (request 22) to the feed once it exists, with a token for the feed
  repo and the update signing key (`CHAIN_UPDATE_KEY`) as secrets.
- **The unported tests** (`07-test-matrix.md`, "The gap"): 83 of
  Electron's test files, mostly renderer tests of ported screens.
- **An update from a prior release**, end to end: install release N, use
  it, update to N+1 through the app, and check data, open projects, task
  history, the shield preference and granted permissions survive
  (roadmap, Phase 7 second bullet).

### Checks only a person can do

Every ticket's remaining hands-on check, in one place. Each needs a
click, a drag or a real account that `chain inspect` can't stand in for.

| Area | Check | Ticket |
| --- | --- | --- |
| Import | The owner's first real import, on first launch | 014 |
| Workspace | The env panel with a real file; tree change marks and the agent diff modal | 021, 023 |
| Agents | The Format button with a real session; a scan, the editor's underlines and a Claude session | 024, 030 |
| Init, Templates, Extensions | Click the screens through | 025, 026, 029 |
| Environment | An editor surviving a quit; go to definition clicked in the editor | 027, 028 |
| API Studio | Route Picker, Environment, Request/Response and Scripts screens; the picker members | 034–040 |
| System | The upload picker, dragging an `.app` from Finder, the restart button | 041 |
| Browser | The agent preview with a real dev server, staying unfiltered; Cmd-click; swipe back and forward; full-screen video; Inspect Element in the preview | 042, 043 |
| Page window | Both toolbar buttons; closing from the title bar; staying above a full-screen app and on another Space; an outside link from a preview floater | 045 |
| Lazy Shield | A real ad-heavy site; the preference across a relaunch | 043 |
| DMG | A real `chain build` output turned into a disk image | 033 |

## Support runbooks

The roadmap asks for one per situation. Not written yet; where to start:

| Runbook | Source |
| --- | --- |
| Logs | `<data>/logs/lazify.log`, path shown in Settings (ticket 031) |
| Data backup and restore | Chain's data folder; the import backups (`08-migration-ledger.md`) |
| Failed migration | `09-rollback-and-recovery.md`, "A bad import" |
| Crashed process | Terminals and agents reattach after a reload (tickets 004, 019, 032) |
| Failed update | Install the previous release by hand (`09`). Written once request 22 ships |
| Missing terminal or runtime | The Developer environment page's tool scan (ticket 027) |
| Project relocation | Projects are keyed by path; a moved project needs the remapping flow (`03-data-inventory.md` §1), not yet built |

## Cutover

The marketing site's download links change only after the Chain release
and its feed are live (roadmap). Until then both apps ship, and Electron
stays the download for everyone.
