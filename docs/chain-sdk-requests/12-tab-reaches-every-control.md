# Capability Request 12 — Tab reaches every button and link

Source: the Lazify rewrite to Chain, Phase 4 ticket 020 (accessibility,
"keyboard navigation"). Row: Navigation/settings.

**Not part of this request:**
- Any change to the page's own focus order or styles. That's the app's.
- Keyboard shortcuts or the app menu.

## Why this needs a new capability

On macOS, WebKit's web views only move Tab focus to buttons and links when
the system's **Keyboard navigation** setting is on
(`AppleKeyboardUIMode`; off by default, and off on the Mac this was found
on). Otherwise Tab visits text fields and pop-up menus only. Chromium,
which Electron Lazify runs on, always lets Tab reach every focusable
element. Nothing in Chain's capabilities touches the web view's
preferences, and an app can't set them itself.

**Not yet confirmed by hand.** Synthetic key events don't move focus, so
this rests on WebKit's documented behaviour. Lazify will confirm with a
real Tab press on its Home screen and update this file.

## What Lazify actually does with this today (Electron, verified in source)

The renderer is keyboard-driven in places: buttons and icon buttons carry
`aria-label`s and `focus-visible` rings (26 source files), modals restore
focus on close, and the sidebar, tab bars and tool rail are plain
`<button>`s. In Electron every one is reachable with Tab, whatever the
system setting.

## What Lazify needs

- An app-wide choice, declared at startup, that Tab moves focus to every
  focusable element, as in Chromium — WebKit's `tabFocusesLinks`
  preference, or whatever Chain decides fits.

## Platforms

macOS first (D-2). Windows (WebView2, Chromium-based) already behaves
this way: not verified.

## Suggested next step for chain-sdk

When it ships, Lazify turns it on and checks that Tab walks the sidebar
buttons on Home with Keyboard navigation off.
