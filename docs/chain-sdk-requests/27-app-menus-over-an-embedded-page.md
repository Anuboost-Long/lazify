# Capability Request 27 — App menus and popovers over an embedded page

Source: the Lazify rewrite to Chain, browser page UX, 2026-10-24.

**Not part of this request:**
- Full dialogs that cover the whole window. Hiding the page under those
  is fine.
- Drawing app content inside the page or changing what the page renders.
- The floating window (request 23), which has no app UI over it.

## What Electron Lazify does

The browser page's toolbar opens small panels anchored under their
buttons: Lazy Shield, history, "Send to agent", and the right-click
context menu. In Electron the page is a `<webview>` element in the
renderer's DOM, so these panels draw over the page like any other
element. The page stays visible, and still moving, around and under
the panel.

## What happens in Lazify Chain

`desktop.browserView` draws a view above the app's page ("no app element
(menu, popover, dialog) can show over a view"). To show a panel, the app
hides the view while the panel is open (`useCoverGuests` in
`src/shared/ui/GuestView.tsx`). The whole tab goes blank behind a
400 px panel, and the page comes back when it closes. Users read that as
the page having crashed or reloaded.

Shrinking the view to leave room isn't a fix: the page is laid out again
at the new width (YouTube reflows its grid), then again when the panel
closes.

## What Lazify needs

While an app panel is open over part of a view:

1. The page stays visible everywhere the panel doesn't cover. A still
   image of the page is acceptable; live is better.
2. The panel draws above the page, clicks on the panel go to the app,
   and the page doesn't resize or reload.
3. When the panel closes, the page is exactly as it was (scroll, video
   position, form state). That already holds for a hidden view.

Panels are small, anchored rectangles, open for seconds, and only one
is open at a time. Lazify knows each panel's box (`getBoundingClientRect()`)
when it opens and when it moves.

## Acceptance

- Open Lazy Shield over youtube.com: the page stays visible to the
  left of and below the panel, and the panel's toggle works.
- The same for the history panel, "Send to agent" and the right-click
  menu.
- Closing the panel leaves the page where it was, with no reload and no
  re-layout.
