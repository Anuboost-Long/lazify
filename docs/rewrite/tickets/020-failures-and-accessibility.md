# 020 — Failures you can understand, and accessibility (Phase 4 / Done)

**Read this whole ticket before touching code.** The last two Phase 4
roadmap items: user-visible failure states, and accessibility and window
controls. Closes Phase 4 once its checklist is done.

## Goal

The Phase 4 exit criterion ends with "…and understand failures without the
old app". The renderer was ported as it is (D-1), so most behaviour came
across with it. This ticket checks, in the real app, what *changed* by
moving off Electron: the bridge's own failures, the window, and WebKit
instead of Chromium.

## Status — 2026-10-10

Checked in the running app (`chain dev`, `chain inspect`, macOS):

- **The app runs on Chain only.** No `electron`, `@tauri-apps/*` or Node
  module is imported anywhere in `src/` or `tests/`; `@chain/sdk` is
  imported only in `src/platform/` (13 files). Every file in
  `.chain/native/src/` is byte-for-byte chain-sdk's template
  (`packages/cli/templates/`), so this app adds no native code. In the
  window: `__TAURI_INTERNALS__` present, no Electron `process`, a WebKit
  user agent, served from this repo's Vite on `localhost:1420`.
  `@tauri-apps/api` in `package.json` is `@chain/sdk`'s own dependency;
  nothing in `src/` uses it or `@tauri-apps/plugin-opener`.
- **An agent that can't start** says why in its tab:
  `zsh:1: command not found: …`. Same as Electron, which also runs
  custom agents as `$SHELL -lc <command>` (`agent-registry.ts:48`).
- **An unported feature** shows the bridge's message in place, e.g. the
  Agents page's Environment panel: "listEnvFiles isn't available in Lazify
  Chain yet." It names an internal function, not something the user
  recognises.

## Source-of-truth references

- Roadmap row: Phase 4, "user-visible failure/progress states" and "Port
  accessibility: keyboard navigation, focus restoration, screen-reader
  labels, reduced-motion support, contrast, and desktop window controls"
- Old source: `src/main/main.ts` `createMainWindow` (1440×920, minimum
  1180×760, `show: false` until painted, `backgroundColor: "#0b1220"`)
- Bridge: `src/platform/lazify.ts`; groups from
  [`../02-contract-manifest.md`](../02-contract-manifest.md)
- Chain: `agent-docs/capabilities/window/CONTRACT.md` ("an app may not
  touch Tauri's window options itself"; size and minimum size are
  non-goals)

## Findings and what to do with each

| # | Finding | Electron | Chain app now | Action |
| --- | --- | --- | --- | --- |
| F1 | Unported member's message names a function | n/a | "listEnvFiles isn't available…" | Name the feature: "Environment files aren't available in Lazify Chain yet." One label per preload group |
| F2 | Env panel shows "No .env file" and **Create .env** next to the error | Same screen code; Electron's list doesn't fail | Misleading while env files are unported | Carried over; disappears when env files are ported (Phase 5). Not changed here |
| F3 | Startup window | Dark `#0b1220`, shown once painted | OS default background, shown immediately | `package.json` `chain.window`: `backgroundColor` `#0b1220`, `showWhen` `firstPaint` |
| F4 | Window size, minimum size, title | 1440×920, min 1180×760, "Lazify" | 800×600 template default, no minimum, "lazify-chain" | Chain has no way: [request 11](../../chain-sdk-requests/11-window-size-and-title.md) |
| F5 | Tab reaching buttons and links | Chromium: always | WebKit on macOS: only when the system's Keyboard navigation setting is on (it is off on this Mac, the default) | [Request 12](../../chain-sdk-requests/12-tab-reaches-every-control.md). Confirm by hand: press Tab on Home |
| F6 | Reduced motion | No `prefers-reduced-motion` in the renderer | Same | Carried over, recorded. Adding it is a product change, not parity |
| F7 | `platform: "darwin"` hard-coded in the bridge | `process.platform` | Wrong on Windows | Out of scope until Windows (D-2); noted |

Focus styles, labels and contrast are the renderer's own code and came
across unchanged (`focus-visible` in 26 files, `aria-label` throughout).

## Acceptance checklist and evidence

- [x] Chain-only audit (above)
- [x] Agent start failure readable in the app
- [x] F1: unported members name their feature (22 labels over the 15
      preload groups, `system` split by member). `tests/platform/lazify.test.ts`.
      In the app, the Environment panel now reads "Editing .env files isn't
      available in Lazify Chain yet."
- [x] F3: after a `chain dev` restart on 2026-10-10,
      `desktop.window.options()` read back `backgroundColor` `#0b1220ff`
      with the standard title bar, as in Electron. `showWhen` is
      startup-only and isn't read back
- [x] F4, F5: requests 11 and 12 written and sent to chain-sdk (2026-10-10)
- [x] F4, F5 shipped: `chain update` (lib.rs, window.rs) and
      `package.json` `chain.window` `size` 1440×888, `minSize` 1180×728
      (Electron's outer sizes less the 32 pt title bar; Chain's sizes are
      the page's area), `title` "Lazify", `tabFocus` "all". After a
      `chain dev` restart: the page laid out at 1440×889, and the window
      server names the window "Lazify"
- [x] F4: dragging the window smaller stops at the minimum (checked by
      the owner by hand, 2026-10-10)
- [x] F5: Tab walks the sidebar buttons on Home with Keyboard navigation
      off (checked by the owner by hand, 2026-10-10)
- [x] `CI=true npm test` (347 passed) and `npm run typecheck` pass

## Not removed

Nothing. Nothing in the Electron repo was changed.

## Rollback

Revert the commit: the message strings and the `chain.window` block are
self-contained.

## Verification log

- 2026-10-10, macOS: audit and failure checks above, through
  `chain inspect`. Test agents and tabs removed afterwards.
- 2026-10-10, macOS: requests 11 and 12 picked up with `chain update`;
  window size, title and background read back in the app; Tab reach and
  the minimum size checked by the owner.
