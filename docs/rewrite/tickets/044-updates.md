# 044 — In-app updates on `desktop.updates` (Phase 7 / Built — waits on the owner's feed, key and a release build)

The Settings "Check for updates" flow, moved from Electron's
`electron-updater` to `desktop.updates`, which chain-sdk built for
[request 22](../../chain-sdk-requests/22-update-the-app-in-place.md)
(D-4: updates in the first release; D-6: ad-hoc signing for now).

## Goal

As Electron: a check only reports; downloading and installing are each
the user's click; installing warns first that agents, scripts and
terminals stop. A downloaded update also installs when the user quits.

## Source-of-truth references

- Old source: `src/main/updater.ts`, `tests/main/updater.test.ts`
- Public API: `getUpdateState`, `checkForUpdates`, `downloadUpdate`,
  `quitAndInstallUpdate`, `onUpdateStateChanged`
- Chain: `agent-docs/capabilities/updates/CONTRACT.md`

## What shipped

- `src/platform/updates.ts`: Electron's flow on `desktop.updates`, keeping
  Electron's `UpdateState`. The bridge members are real.
- `getUpdateState` asks Chain when the page has no state yet: a restart
  in Lazify Chain reloads the page, and Chain keeps a downloaded update
  until quit, so Settings still shows "ready to install" after a reload.
- `UpdateState`'s `unsupported` gained two reasons Electron didn't have,
  each with its own message in all three languages: `read-only` (this user
  can't replace the app where it's installed) and `not-configured` (a
  build without a feed).
- `tests/platform/updates.test.ts`: Electron's seven updater cases on
  Chain (the Linux AppImage case becomes read-only and not-configured),
  plus a download that fails to verify and an update waiting across a
  page reload.

## Different by design

- **Download speed** is averaged since the download started; Chain reports
  bytes only. The Settings screen doesn't show it.
- **Permissions on ad-hoc builds.** chain-sdk verified that with ad-hoc
  signing (D-6) every update makes macOS ask again for microphone, Apple
  Events and Files and Folders. Folders the user picked keep working, and
  an update opens without a Gatekeeper prompt. A self-signed code-signing
  certificate, kept and reused for every build, removes the repeated
  prompts with no Apple membership. Owner decision, see
  `10-release-readiness.md`.

## Not configured yet

`package.json` has no `chain.updates`: the feed's address and the public
key are the owner's (`10-release-readiness.md`). Until then every build
reports `not-configured`. Adding it makes `chain build` require the
private key (`CHAIN_UPDATE_KEY`).

## Acceptance checklist and evidence

- [x] Electron's updater cases pass on Chain; `CI=true npm test`,
      `npm run typecheck`
- [x] A `chain dev` run reports itself unsupported in Settings
- [ ] Installed build N updates to N+1 through Settings, and by quitting,
      with data, projects, task history and the shield preference intact
      (needs the feed, the key and a release build)

## Rollback

Revert the commit; the five members go back to their stubs.
