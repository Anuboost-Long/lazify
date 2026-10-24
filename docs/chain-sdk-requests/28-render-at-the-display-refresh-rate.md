# Capability Request 28 — Render the app's page at the display's refresh rate

Source: the Lazify rewrite to Chain, sidebar animation, 2026-10-24.

**Not part of this request:**
- Embedded `browserView` pages or the floating window. The app's own page
  matters first; views can follow if it's the same switch.
- Lowering the rate to save power. The OS already does that for idle
  pages.

## What Electron Lazify does

Chromium paints at the display's refresh rate. On a MacBook Pro's
ProMotion screen (120 Hz), the sidebar's collapse (`transition-[width]
duration-200`), button presses and page fades run at 120 fps.

## What happens in Lazify Chain

The same animations run at 60 fps. Measured with `chain inspect --trace`
on the owner's Liquid Retina XDR display (120 Hz), Home page, window
focused, the sidebar toggled 8 times: 496 frames in about 8 s, 3 frames
over 33 ms, none over 50 ms. The page keeps up; it's just capped at 60.
Next to the Electron app on the same screen, the owner calls it "really
choppy", on every page.

WebKit holds pages to about 60 fps by default. Safari exposes this as the
"Prefer Page Rendering Updates near 60fps" feature flag.

## What Lazify needs

- The app's page renders at the display's refresh rate on high-refresh
  displays (120 Hz ProMotion, external 144 Hz), so CSS transitions,
  Web Animations and `requestAnimationFrame` match the screen.
- Declared in `package.json` `"chain"` (e.g. under `window`), or the
  default. Lazify wants it on.

## Acceptance

- On a 120 Hz display, `chain inspect --trace` over the same sidebar
  toggles reports about 120 frames per second instead of 60.
- On a 60 Hz display nothing changes.
