# 042 — Browser and agent preview on `desktop.browserView` (Phase 6 / In progress)

**Read this whole ticket before touching code.** The browser page's tabs
and the Agents page's preview pane, moved from Electron's `<webview>` to
Chain's embedded view (chain-sdk request 18). Lazy Shield and media
picture-in-picture stay out: they need a later request for running
script inside a view.

## Goal

The browser page browses: tabs, address bar, back/forward/reload,
history, popups held or opened as tabs, Cmd-click to a background tab,
the redirect guard, error screens, restored tabs. The agent preview shows
a dev server and sends everything off-machine to the system browser.

## Status — 2026-10-17

`chain update` brought in `desktop.browserView`; `cargo check` with the
dev features passes. Implementation starting.

## Source-of-truth references

- Roadmap row: Phase 6, "Port the integrated browser…"
- Old source: `src/main/browser/preview-guard.ts` (both guest policies),
  `popup-policy.ts` (same-site test, popup allowlist),
  `swipe-navigation.ts`; renderer `features/browser/*`,
  `features/agents/components/preview/AgentPreviewPanel.tsx`
- Public API: `onBrowserOpenTab`, `onBrowserPopupBlocked`,
  `allowPopupsFrom`, `onBrowserSwipeProgress`
- Old tests: `tests/renderer/browser-{address-input,search-engine,history,
  history-tab,restore-tabs,guest-navigation,page-errors}.test.ts`. None
  for the policies — recorded as a golden fixture from Electron here
- Persistent data: `popup-allowlist.json` (imported by ticket 012), the
  `lazify-web` / `lazify-preview` web sessions (cookies are not imported:
  WebKit can't read Chromium's store — users sign in again)
- Chain: `chain-sdk/agent-docs/capabilities/browser-view/CONTRACT.md`

## Target boundary

- `@/platform/browser-view`: one `Guest` per view, offering the subset
  of Electron's `<webview>` the renderer already calls (`loadURL`,
  `goBack`, `canGoBack`, `getURL`, `addEventListener("did-navigate")`,
  …) on top of `desktop.browserView`'s state events, so the ported
  components keep their shape. Both guest policies live here, as
  Electron kept them in main: the page can't see or change them.
- `@/shared/ui/GuestView`: the component that places a native view over
  its own box (`ResizeObserver` → `setBounds`), shows/hides it, and
  closes it on unmount. Replaces the `<webview>` tag.
- Pure policy (`siteOf`, `isCrossSite`, `isLoopbackUrl`, and the
  decision a navigation or a new window gets) in
  `@/shared/lib/browser/`, so it is testable without a view.

## Different by design (WebKit, not Chromium)

- **Load errors** are classified from the view's `reason`, not
  Chromium's net error codes: `offline`→no-internet,
  `host-not-found`→site-not-found, `unreachable`→site-unreachable,
  `insecure-connection`→insecure-certificate, `blocked`→blocked,
  `other`→unknown. Being offline still outranks the reason.
- **Swipe** uses WebKit's own back/forward gesture and animation; Lazify's
  own indicator (`onBrowserSwipeProgress`) never fires.
- **A view draws above the app's page.** Electron's `<webview>` already
  wasn't reliably coverable (see `HistoryPage`'s note); here it never
  is, so the toolbar's dropdowns (History, Lazy Shield, Send to agent)
  hide the active view while they're open.
- **Devtools** in the preview: `inspectable` — right-click → Inspect
  Element, or Safari's Develop menu. No programmatic open/close.
- **Background tabs keep playing** only as far as WebKit keeps a hidden
  view's media running; Electron opted out of Chromium's throttling.
- **No Chromium error page shows through**: WebKit shows nothing on a
  failed load, and the app's own error screen covers the view's box (the
  view is hidden while it's up).

## Acceptance checklist and evidence

- [ ] Golden fixture from Electron: `siteOf`, `isCrossSite`,
      `isLoopbackUrl`
- [ ] Characterisation tests: every branch of the browser policy (same
      site, allowed opener, no initiator, fresh input spent once, nested
      frame, modified clicks, blank popups) and the preview policy
- [ ] Electron's seven browser renderer tests pass on the copy (guest
      navigation and page errors adapted to the `Guest` events)
- [ ] In the app: open a site, navigate, back/forward, reload/stop,
      a popup opened as a tab and a cross-site one held, Cmd-click to a
      background tab, an error screen, the preview on a real dev server
      with an external link sent to the system browser
- [ ] For chain-sdk: trackpad swipe, element fullscreen, Inspect Element,
      middle/secondary buttons, the file-upload panel
- [ ] `CI=true npm test`, `npm run typecheck`, `npm run build:web`

## Not removed

Nothing in the Electron repo is changed.

## Rollback

Revert the commits; the guests go back to an unrendered `<webview>` tag
and the bridge members to their stubs.

## Verification log
