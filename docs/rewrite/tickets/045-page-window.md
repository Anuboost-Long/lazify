# 045 — The floating page window on `desktop.browserView` (Phase 6 / Built — waits on chain-sdk committing request 23 and a person's checks)

The browser page's and the agent preview's "keep this page on screen"
button, on the `floating` view chain-sdk built for
[request 23](../../chain-sdk-requests/23-floating-page-window.md). It was
the last bridge member that rejected with "isn't available in Lazify yet".

## Goal

As Electron: one small window above every app, on the session of the
surface that asked, re-pointed when asked again, with both toolbar
buttons following it and hearing the user close it.

## Source-of-truth references

- Old source: `src/main/media/picture-in-picture.ts`,
  `src/renderer/shared/hooks/use-picture-in-picture.ts` (ported unchanged)
- Public API: `openPictureInPicture`, `closePictureInPicture`,
  `getPictureInPictureState`, `onPictureInPictureChanged`
- Chain: `agent-docs/capabilities/browser-view/CONTRACT.md`, "Floating
  views" (chain-sdk working tree, not committed on 2026-10-23)
- Old tests: none in Electron; `tests/platform/page-window.test.ts` added

## What shipped

- `src/platform/page-window.ts`: Electron's one-window state on top of a
  floating `Guest`. A remote address from the preview is ignored, as in
  Electron. Opening from the same surface loads the new address in the open
  window. The state reports the address just asked for: the view reports
  its own only once the load starts.
- `src/platform/browser-view.ts`: `openFloatingGuest(session, url)` creates
  the view with `floating: {}` (Chain's 480 × 320, minimum 240 × 160, the
  page's own title, like Electron's window). The preview's floater has
  `decideNavigation` and the preview's policy (loopback stays, anything else
  goes to the system browser). The browser page's floater navigates freely,
  as Electron's did. Every popup from either one goes to the system browser
  (`decidePreviewNewWindow`), not to a tab. `onClose` closes the guest and
  fires `closed`. A view that couldn't be created fires `closed` too, so the
  button turns back off.
- Lazy Shield needs no setup: the floater is a view on `lazify-web`, and
  the shield's rules and script are session-wide.

## Different by design

- **Re-pointing from the other surface opens a new window.** Electron
  loaded the new page into the existing window, so a preview page floated
  after a browser page ran on the browser's partition, with its sign-ins.
  A Chain view's session is fixed, so Lazify closes the window and opens one
  on the right session. The comment in Electron's own module says that
  isolation is what it intends.
- **A reload closes it.** Chain closes every view when its page reloads.
  Electron's window outlived a renderer reload. After a reload both buttons
  read "closed", which is true.

## Acceptance checklist and evidence

- [x] `tests/platform/page-window.test.ts`: the browser and preview sessions
      and navigation, the loopback refusal, popups to the system browser,
      re-pointing versus replacing, the title-bar close, a failed create
- [x] `CI=true npm test`, `npm run typecheck`
- [x] In the app (2026-10-23, macOS, `chain dev`): `example.com` opened in a
      floating window over Lazify, titled "Example Domain"; asking again
      with `iana.org` re-pointed the same window, and both
      `onPictureInPictureChanged` and `getPictureInPictureState` reported
      it; `closePictureInPicture` closed it; a remote address from the
      preview was refused with nothing opened
- [ ] By a person: the toolbar buttons clicked on both surfaces; closing
      from the title bar turns the button off; the window staying above a
      full-screen app and on another Space; a preview floater on a real
      dev server sending an outside link to the system browser

## Not removed

Electron's module stays in `../lazify`. The renderer hook and both buttons
were already ported unchanged.

## Rollback

Restore the four stubs in `src/platform/lazify.ts`: the buttons say the
feature isn't available, and nothing else depends on it.

## Verification log

- 2026-10-23, macOS 27, `chain dev` against chain-sdk's working tree: the
  checks above through `chain inspect` and screen captures. The title-bar
  close couldn't be driven (no accessibility access for System Events), so
  it's on the person's list.
