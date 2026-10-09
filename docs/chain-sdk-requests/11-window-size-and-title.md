# Capability Request 11 — The window's starting size, minimum size and title

Source: the Lazify rewrite to Chain, Phase 4 ticket 020 (failures and
accessibility, "desktop window controls"). Row: Launch and recovery.

**Not part of this request:**
- Remembering the window's size or position between launches.
- More than one window.
- Changing the size from the page at runtime.

## Why this needs a new capability

`desktop.window`'s contract lists "Window size, position, minimum size, or
multiple-window management" under Non-goals, and says an app may not touch
Tauri's window options itself. So today the Chain app opens at the
template's 800×600, can be shrunk to any size, and is titled
"lazify-chain". Setting these in `.chain/native/tauri.conf.json` would be
the app reaching past Chain into the framework's own config.

## What Lazify actually does with this today (Electron, verified in source)

`src/main/main.ts` `createMainWindow`:

```ts
new BrowserWindow({ width: 1440, height: 920, minWidth: 1180, minHeight: 760, … })
```

The window title is the product name, "Lazify". The renderer's layout
(sidebar, project list, agent workspace with a tool rail) is built for at
least 1180×760. Below that, the Agents page's panes overlap; 800×600 is
well under it.

## What Lazify needs

Declared at startup, the way `"chain.window"` already is in
`package.json`:

- **Starting size** of the main window.
- **Minimum size** the user can resize it to.
- **Title** of the window (what the OS shows in the window menu, Mission
  Control and the Dock's window list).

Lazify has no need to change these at runtime.

## Platforms

macOS first (D-2). Windows: not verified.

## Suggested next step for chain-sdk

When it ships, Lazify declares 1440×920, minimum 1180×760 and "Lazify",
and checks after a `chain dev` restart that the window opens at that size
and can't be dragged smaller.
