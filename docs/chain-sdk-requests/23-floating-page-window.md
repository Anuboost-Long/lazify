# Capability Request 23 — A page in a small window that floats above everything

Source: the Lazify rewrite to Chain, the last unported browser feature
(tickets 042/043 follow-up), 2026-10-17.

**Not part of this request:**
- Video picture-in-picture. The OS's floating video player already works
  through `desktop.browserView` (`allowPictureInPicture`, `runInFrames`,
  request 21).
- More than one floating window. Lazify keeps exactly one and re-points it.
- A second app window, or Tauri multi-window in general. This is a
  single page shown on a session, like `desktop.browser`'s window.
- Tabs, an address bar, or any controls inside the floating window.

## What Electron Lazify does

The browser page and the agent preview each have a "keep this page on
screen" button (`src/main/media/picture-in-picture.ts`,
`src/renderer/shared/hooks/use-picture-in-picture.ts`). It opens the page
the surface is showing in a small window that stays above other apps, so
a dev server's output can sit next to the editor changing it, or a page
can stay visible over a full-screen app:

- 480 × 320 to start, resizable down to 240 × 160; it can't be
  maximised or made full screen, and stays out of the window switcher.
- Always on top at the "floating" level, visible on every Space and over
  full-screen apps.
- Joins the session of the surface it came from: the browser page's
  (signed in, and filtered by Lazy Shield, which applies session-wide in
  Electron) or the preview's.
- From the preview, it only loads this machine's addresses: navigating
  anywhere else, or any popup, goes to the system browser instead. From
  the browser page, popups go to the system browser too.
- Asking again re-points the open window, from either surface. The app
  knows whether it's open, what it shows and which surface owns it, and
  hears when the user closes it from its title bar, so both buttons stay
  in step.
- It keeps running when unfocused (no background throttling).
- It closes when the main window closes.

In Lazify Chain these are stubs (`openPictureInPicture`,
`closePictureInPicture`, `getPictureInPictureState`,
`onPictureInPictureChanged` in `src/platform/lazify.ts`).

## Why existing capabilities don't cover it

`desktop.browser` comes closest. Its contract already gives: a separate
OS window on a named session ("A name means the same store here and in
`desktop.browser`", browser-view CONTRACT), `toolbar: false`, `open()`
re-pointing an open window, `close()`, `onClose` with `reason`, and
`current()`/`onNavigate`. What it lacks:

1. **Staying on top.** No option keeps the window above other apps, on
   every Space, or over full-screen apps.
2. **Deciding navigation and popups.** "`window.open` and
   `target=_blank` open a popup window on the same session", and nothing
   lets the app refuse a navigation or send it elsewhere. The preview's
   floater must stay on loopback, and every popup must go to the system
   browser.
3. **Session rules and page scripts.** `setRules`/`setScript` are
   documented for `desktop.browserView` sessions. The contract doesn't
   say whether a `desktop.browser` window on the same session name is
   filtered too. Lazy Shield must apply there, as it does in Electron.
4. **Window shape.** Its minimum size is 480 × 360 by default; whether
   smaller minimums, no full screen and no maximise are allowed isn't
   stated.

`desktop.browserView` can't do it either: a view draws inside the app's
own window, which isn't on top of other apps.

## What Lazify needs

A page window, on a named session, that:

1. Floats above other apps' windows, on every Space and over full-screen
   apps, until closed.
2. Opens small (480 × 320) with a 240 × 160 minimum, and can't go full
   screen or maximise. No toolbar.
3. Lets the app decide each main-frame navigation and each popup the
   page asks for, as `desktop.browserView`'s `decideNavigation` and
   `onNewWindow` already do. Lazify answers "allow", "refuse", or opens
   the URL in the system browser itself.
4. Gets the same rule lists and page scripts as views on that session, so
   Lazy Shield needs no second setup.
5. Re-points when opened again, reports what it shows, and tells the app
   when the user closes it. `open`/`close`/`onClose`/`current` cover
   this already.
6. Keeps its page running while it isn't focused.
7. Closes when the app's main window closes, or the app quits.

How this is shaped is Chain's call: options on `desktop.browser`, a
floating mode on `desktop.browserView`, or something else. Note that
`desktop.browser` allows one window per session, and the browser page's
session (`lazify-web`) and the preview's (`lazify-preview`) are already
used by `desktop.browserView` views; the floater has to share those
stores, not copies of them.

## How Lazify will use it

`src/platform/page-window.ts` replaces the four stubs: it opens the
window on the surface's session, answers navigations with the policy
Lazify already has (`decidePreviewNavigation`/`decidePreviewNewWindow`
for the preview, popups to the system browser for the browser page), and
publishes `{ open, url, source }` so both toolbar buttons follow it.
The renderer's `usePictureInPicture` hook and both buttons are already
ported unchanged.

## macOS / Windows

- **macOS**: needed for the first release (D-2). A floating window level
  and "join all Spaces / full-screen auxiliary" behaviour exist in
  AppKit. Not verified through Chain.
- **Windows**: Electron used always-on-top on Windows too; not needed
  until Chain ships there. Not verified.
