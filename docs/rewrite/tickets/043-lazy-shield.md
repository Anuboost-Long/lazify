# 043 — Lazy Shield on `desktop.browserView` rules and page scripts (Phase 6 / Done — preview and a real-site pass left)

**Read this whole ticket before touching code.** The browser page's ad and
tracker blocker, moved from Electron's `webRequest` hooks and Ghostery's
Electron preload to the rules, page scripts and `ask()` channel chain-sdk
added for [request 21](../../chain-sdk-requests/21-filter-and-script-embedded-pages.md).

## Goal

The shield toggle in the browser toolbar works as in Electron: on by
default, remembered, and while on, the browser session's pages load
without what Ghostery's full lists block, with ads hidden on the page,
and with popups those lists name refused. The agent preview is never
filtered.

## Status — 2026-10-17

Works in the app. On by default from the imported `lazy-shield.json`; the
lists (8.3 MB) are fetched through `desktop.http`, cached for 3 days, and
converted to one list of 120,492 rules (2,306 filters left out: 1,215
redirects, 249 removeparam, 231 regular expressions, 231 denyallow, 129
cosmetic exceptions, 89 wildcard-only domains, 86 csp, 58 replace, 18
alternation/braces). Verified with a local test page served under a
real host name (`*.localtest.me` → 127.0.0.1; Ghostery hands out no
cosmetic rules for `localhost`, in Electron too): an EasyList-named image
never reached the server, an `ins.adsbygoogle[data-ad-client]` was
hidden, switching off and reloading brought both back, switching on
again and reloading took them away; going straight to the blocked
image's address loaded it (the page asked for).

Found live and changed: a condition per rule on the page's own address
(`unlessTopUrl`, to spare the page asked for) made WebKit's compiled
list 150 MB and slow to build (re-enabling took 72–110 s). One closing
rule letting first-party documents through says the same: 50 MB, a fresh
compile ≈ 25 s, re-enabling ≈ 13 s, a relaunch with unchanged lists ≈ 9 s
end to end (Chain's `setRules` 7.4 s of it). The browser's first page
waits up to 5 s for the shield, as Electron held early requests; past
that it loads unfiltered and the next load is filtered.

## Source-of-truth references

- Old source: `src/main/browser/lazy-shield.ts` (engine, cache,
  preference, `shouldBlockPopup`), `@ghostery/adblocker-electron`
  (`onInjectCosmeticFilters`) and `@ghostery/adblocker-electron-preload`
  (the DOM monitor)
- Public API: `getLazyShieldState`, `setLazyShield`, `onLazyShieldBlocked`
- Persistent data: `lazy-shield.json` (`{ enabled }`, imported by ticket
  012); a new cache of the lists in the app's data folder
- Chain: `browser-view/CONTRACT.md`, "Filtering and scripting a
  session's pages"

## Target boundary

- **Engine:** Ghostery's `FiltersEngine`, built in Lazify's own page from
  the same raw lists as Electron's full set (`fullLists`), fetched through
  `desktop.http` and cached for 3 days, as Electron cached its engine.
- **Network blocking:** each list's network filters, parsed by Ghostery
  (`parseFilters`, debug mode keeps the domain names), converted to
  Chain's rule subset (`@/shared/lib/browser/shield-rules`) and set as
  rule lists on the `lazify-web` session. Exceptions come after the
  blocks in the same list, so `ignore-previous-rules` undoes them.
  Filters the subset can't express are left out and counted.
- **Cosmetics:** a page script (bundled, Ghostery's DOM monitor) asks over
  `chainBrowserView.ask()` and inserts the styles and scriptlets the
  engine answers with (`getCosmeticsFilters`, as Electron's
  `onInjectCosmeticFilters`). Main frame only, as Electron's preload.
  The answer is computed from the frame URL Chain reports, never the
  message's own claims, and it carries nothing but public filter output.
- **Popups:** the browser policy asks the engine before a popup becomes a
  tab (Electron's `shouldBlockPopup`).

## Different by design

- **The asked-for page is spared by party, not by address.** Electron's
  engine never cancelled a main frame; here the list ends by letting every
  first-party document through. Same-site ad frames (an `ads.` subdomain
  framed by its own site) get through too.
- **No blocked counter.** WebKit reports blocks only through unpublished
  API; the toolbar shows the shield on or off, without a number.
- **Scriptlets and strict pages.** Electron ran scriptlets with
  `executeJavaScript`, which a page's Content Security Policy doesn't
  govern. Here the page script inserts them as script elements, which it
  does — on a page whose policy forbids inline scripts, styles still
  apply but scriptlets don't.
- **`$redirect`, `$csp`, `$removeparam`, `$replace` and regex filters** have
  no form in the rule subset and are left out, where Electron applied
  them per request. (Electron already dropped `data:` redirects as
  unperformable, see `honourable()`.)
- **Rules take effect from each page's next load**, where Electron's hooks
  applied to the next request.

## Acceptance checklist and evidence

- [x] Converter: every filter shape it accepts and every one it refuses,
      unit-tested (`shield-rules.test.ts`, 10); real lists converted with the
      refused count recorded (above)
- [x] Cosmetic answer: Electron's `onInjectCosmeticFilters` query, same
      engine and lists; checked against the real lists for a real host and
      `localhost`
- [ ] In the app — done but the preview and a relaunch: an ad request on a test page blocked, an ad element
      hidden, the toggle off restores both after reload, the preference
      survives a relaunch, the preview unfiltered
- [x] chain-sdk's open items: a real Ghostery-derived list's compile time
      (above), and old compiled versions leaving the store (one file left
      after several on/off cycles)
- [x] `CI=true npm test`, `npm run typecheck`, `npm run build:web`

## Not removed

Nothing in the Electron repo is changed.

## Rollback

Revert the commits; the shield members go back to their stubs.

## Verification log

- 2026-10-17, macOS 27 arm64, `chain dev`: the runs in Status. Test pages,
  server and tabs removed afterward; the shield left on.
