# Capability Request 08 — Zoom the app's page

Source: the Lazify rewrite to Chain, Phase 4 ticket 016 (settings). Row:
App and UI settings.

**Not part of this request:**
- The window's green zoom button (`windowButtons.zoom`), which already
  exists.
- Pinch-to-zoom inside an embedded browser view.
- An application menu. Lazify's View menu (Zoom In, Zoom Out, Actual Size)
  is a later request with the app menu; until then the page's own
  Cmd + / Cmd − / Cmd 0 handling calls this.

## Why this needs a new capability

`window`'s contract says it outright: "page zoomed with the webview's zoom
isn't supported." CSS `zoom` on the page is only an approximation: it
changes layout maths that `xterm.js` measures (cell size, scrollbar), and
fixed-position overlays and `getBoundingClientRect` disagree with what is
drawn.

## What Lazify actually does with this today (Electron, verified in source)

`src/main/window-zoom.ts`: a zoom factor stepped through
`[0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2]`, applied with
`webContents.setZoomFactor(factor)`, saved to `window-zoom.json` and
restored at launch. The renderer's Settings and keyboard shortcuts call
`readZoom`, `setZoom`, `stepZoom` and `resetZoom`, and listen for
`zoom-changed`. Trackpad pinch (`webContents.on("zoom-changed")`) steps it
too, and `holdZoomSteady` stops Chromium's own visual zoom from drifting
away from the saved factor.

## What Lazify needs

- **Set the page zoom factor** of the calling window, like a browser's page
  zoom: layout reflows at the new size, and `devicePixelRatio`-based
  drawing (canvases, `xterm.js`) stays sharp.
- **Read the current factor.**
- Accept factors from 0.5 to 2 (Lazify clamps; reject or clamp outside
  that, Chain's choice).
- Lazify persists the factor itself and applies it at startup, so the
  factor doesn't need to survive a restart on Chain's side, but applying
  it before the first paint would avoid a flash at 100%.
- Nice to have, not required: an event when the system pinch gesture
  changes the zoom, so Lazify can snap it to its steps.

## Platforms

macOS first (D-2).

## Suggested next step for chain-sdk

When it ships, Lazify wires it into `readZoom`, `setZoom`, `stepZoom`,
`resetZoom` and `onZoomChanged`, and checks that the terminal stays sharp
and aligned at 75% and 150%.
