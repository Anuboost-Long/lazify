# Capability Request 21 — Filter and script the pages in an embedded view

Source: the Lazify rewrite to Chain, Phase 6 browser slice (ticket 042),
2026-10-17. The follow-up [request 18](18-embedded-browser-view.md) named
ahead of time ("What's next, pinned down ahead of time"), now that
`desktop.browserView` exists to build against.

**Not part of this request:**
- **The ad blocker itself.** Lazify keeps using Ghostery's engine
  (`@ghostery/adblocker`) and the community filter lists it already
  ships with in Electron. Which lists, how they're fetched and cached,
  the on/off switch, the per-site exceptions and the blocked counter's
  UI all stay app code. This asks only for the hooks an engine plugs
  into.
- **The whole-page picture-in-picture window** (a page floated into its
  own always-on-top OS window). That's a separate-window concern, not
  this one. See request 18's note.
- **The app's own webview.** Only pages inside `desktop.browserView`
  views, scoped by session name.
- **A per-request JavaScript callback**, if the platform can't offer
  one honestly (see the survey below). Lazify needs requests blocked
  before they're sent, not necessarily a callback.

## Why existing capabilities don't cover it

`desktop.browserView`'s contract lists both as non-goals:

> **Running app-supplied script in a view**, or a channel from a page
> back to the app. Media picture-in-picture and cosmetic filtering will
> need it; it reaches into nested frames and cross-origin content, so
> it's its own request.

> **Inspecting, blocking or rewriting a view's network requests or
> responses** — Lazy Shield's network half, also its own request.

Nothing else in Chain reaches inside a view's page or its traffic, and
nothing should: the view's whole point is that the page can't reach the
app.

## What Lazify does today (Electron, verified in source)

`src/main/browser/lazy-shield.ts` (380 lines) and
`src/main/media/media-pip.ts` (108 lines):

1. **Network filtering.** `ElectronBlocker.fromPrebuiltFull()` builds an
   engine from Ghostery's prebuilt lists (EasyList, EasyPrivacy, uBlock
   filters and the like), cached on disk and refreshed after 3 days.
   It's attached to the browser session only (`persist:lazify-web`,
   never the agent preview's) through `webRequest.onBeforeRequest` (cancel
   or redirect, per request, with URL, resource type, initiating frame
   and method) and `onHeadersReceived` (rewrite response headers, mostly
   CSP for injected scripts). Switchable at runtime; off detaches both.
2. **A blocked counter.** Each block increments a count the toolbar shows
   ("12 blocked"), reset when the user switches the shield off.
3. **Cosmetic filtering and scriptlets.** Ghostery's guest preload runs
   in every frame of the browser session, asks the host "what applies to
   this URL" over IPC, and gets back CSS to inject (element hiding) and
   scriptlets (small scripts that must run in the page's own world,
   before its scripts, to neutralise ad code). It runs per navigation,
   including SPA ones, and re-asks as the DOM mutates. Some hosts get
   network filtering but no cosmetic filtering (YouTube: hiding the
   wrong element stops its player from ever being built).
4. **Media picture-in-picture.** For the toolbar's "picture in picture"
   button: walk the page's main frame and **every nested frame**
   (`mainFrame.framesInSubtree`; a `<video>` is often in an embed's
   cross-origin iframe), run a script in each that exits PiP if one is
   active, otherwise run one that finds a playing `<video>` and calls
   `requestPictureInPicture()`, and read back each frame's result
   (`"entered"`, `"exited"`, `"unsupported"`, `"none"`). The call has to
   count as a user gesture (`executeJavaScript(code, true)`); Chromium
   refuses PiP without one.

## What Lazify needs

Primitives, scoped to one named session's views:

- **Block requests by rules, before they're sent.** For every request a
  view's page makes (top document, nested frames, scripts, images,
  XHR/fetch, media, websockets), Lazify's rules decide allow or block.
  Rules must be replaceable while views are open (list refresh, the
  on/off switch), and take effect on the next request or load. Rule sets
  are large: Ghostery's full prebuilt set is on the order of 100k
  network rules.
- **Hide elements by rules, per site.** CSS selectors applied to pages
  whose host matches, with per-host exceptions (the YouTube case above).
- **Run app-supplied script in a view's frames, early.** A script Lazify
  provides that runs in every frame of every page in the session, at
  document start, in the page's own JavaScript world (scriptlets patch
  the page's globals, so an isolated world defeats them), and again on
  each navigation. Lazify supplies the script; Chain never interprets it.
- **A channel from that script back to the app, with a reply.** The
  in-page script asks "what applies to this URL" and gets an answer
  back, and Lazify knows which view and frame (URL, main frame or not)
  asked. This is also what solves the frame-listing problem
  `desktop.browserView` raised: frames needn't be listed if each frame's
  script reports in.
- **Run a script in a view's frames on demand and read the results.**
  For media PiP: run in the main frame and every nested frame
  (cross-origin included), as a user gesture, and resolve with each
  frame's JSON-serialisable result.
- **Optional: know when a rule blocked something.** Only to drive the
  counter. If the platform can't say without private API, Lazify will
  show the shield as on/off without a count.

## macOS and Windows

**macOS (WKWebView), from Apple's public API — not yet verified in
code:**

- There's no public per-request callback for a page's http(s)
  subresources. `WKURLSchemeHandler` only covers custom schemes. The
  public mechanism is `WKContentRuleListStore` / `WKContentRuleList`:
  declarative JSON rules (block, block cookies, upgrade to https,
  `css-display-none` for element hiding, `if-domain`/`unless-domain`,
  resource types, load types), compiled once and attached per web view
  through `WKUserContentController.add(_:)`. It's what Safari content
  blockers use, it covers both "block requests by rules" and "hide
  elements by rules" above, and lists are added/removed at runtime. A
  single compiled list has a rule limit (150k at last report); several
  lists can be attached. **Corrected 2026-10-17:** no published Ghostery
  converter targets this format. Its published converter
  (`@ghostery/urlfilter2dnr`), like eyeo's `@eyeo/abp2dnr`, targets
  Chrome's declarativeNetRequest (DNR) format. If Chain's format stays
  content-blocker-shaped, Lazify converts app-side; that's Lazify's work.
- Blocked-count notifications exist only on a private
  `WKNavigationDelegate` method, so the count stays optional.
- `WKUserScript` (injection time `.atDocumentStart`,
  `forMainFrameOnly: false`, in a `WKContentWorld`, `.page` included)
  covers "run app-supplied script in every frame, early".
- `WKScriptMessageHandlerWithReply` (macOS 11+) covers "a channel back to
  the app, with a reply", and each message carries the sending frame's
  `WKFrameInfo` (main frame or not, its request's URL, security origin).
- `callAsyncJavaScript(_:arguments:in:in:)` (macOS 11+) runs a script
  in a given `WKFrameInfo`, which Lazify gets from the frames' own
  messages above. Whether a script evaluated this way counts as a user
  gesture for `requestPictureInPicture()` needs checking on real WebKit.
  WebKit's private `_evaluateJavaScriptWithoutUserGesture` suggests the
  public path does count, but that's an inference, not verified.

**Windows (WebView2), not verified:** `AddWebResourceRequestedFilter` +
`WebResourceRequested` gives a real per-request callback (block by
answering with an empty response); `AddScriptToExecuteOnDocumentCreated`
covers early script in every frame; `ExecuteScript` per
`CoreWebView2Frame` and `postMessage`/`WebMessageReceived` cover the
rest. Not needed for Lazify's first release (D-2: macOS only).

## Open questions for Chain

- One request or two? "Block and hide by rules" and "script plus a
  channel" are separable, and either alone unblocks part of Lazy Shield.
  Media PiP needs only the second.
- Whether the rules primitive is declarative (WebKit's shape) on every
  platform, so an app writes rules once.
