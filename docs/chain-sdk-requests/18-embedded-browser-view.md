# Capability Request 18 — An embedded, isolated web view inside the app's own window

Source: the Lazify rewrite to Chain, Phase 6 browser slice. Decision D-3
(`docs/rewrite/04-architecture-decisions.md`) was open pending the owner;
decided 2026-10-15: keep the browser, scope it from here.

**Not part of this request:**
- **Tracker/ad blocking (Lazy Shield).** It needs the guest to run an
  app-supplied script after each page loads (the cosmetic half: hiding
  elements a filter list names) and needs outgoing requests inspected and
  cancellable before they're sent (the network half). Script execution
  inside a guest is a different, more sensitive ask than anything below,
  so it's left for its own request once the embedding itself exists to
  build it against.
- **Media picture-in-picture** from a video playing in the browser. A
  later, separate ask once there's a guest to float out of.
- **`desktop.browser`**, today's single-site SSO popup window, is
  unaffected and stays exactly as it is — this is a second, different
  primitive: content hosted *inside* the app's own window, not a window
  of its own. See "Why existing capabilities don't cover it" below.
- The policy decisions themselves (which popups to allow, which errors
  map to which message, which permissions a page may ask for, how tabs
  and history are organised). All of that is pure app code today and
  stays app code — this request is only for the primitive it runs on top
  of.

## Why existing capabilities don't cover it

`desktop.browser`'s own contract says what it is: "opens a **separate OS
window** holding a full web view... The page may only navigate to
`http`, `https`, `about:`, `data:` and `blob:` addresses, **never to the
app's own origin**." That's the right shape for a one-off SSO sign-in;
it is not a surface the app can place inside its own tab strip and
content area, switch between, or lay out next to its own toolbar.
Nothing else in the capability list embeds remote web content inside the
app's window at all — `../../AGENTS.md` already rules out reaching for
Tauri's own webview APIs directly, which is what this app's ported
renderer currently sits on top of (see below) and the one thing it may
never do without going through `@chain/sdk`.

## What Lazify actually does today (Electron, verified in source)

- **Embedding.** One `<webview>` tag per open tab
  (`src/renderer/features/browser/components/BrowserGuest.tsx`), laid
  out inside the app's own window alongside its tab strip, address bar
  and toolbar — not a separate window. Every browser tab shares one
  named, persistent session (`persist:lazify-web`, cookies and site
  storage kept between launches); a second, separate session
  (`persist:lazify-preview`) is used elsewhere for an agent's dev-server
  preview and the two are never mixed (`src/main/browser/preview-guard.ts`).
  The app's Chain port already carries this `<webview>` tag over
  unchanged from the port-as-is pass (ticket 015); it renders nothing
  under Tauri today, which is the actual gap this request closes.
- **Navigation control and state**, read by the tab strip and address
  bar: `dom-ready`, `did-start-loading`, `did-stop-loading`,
  `did-navigate`, `did-navigate-in-page`, `page-title-updated`
  (`BrowserGuest.tsx`); back/forward/reload/stop, each guest keeping its
  own history.
- **Failed loads and crashes**, read by the error page
  (`src/renderer/features/browser/hooks/use-page-load-error.ts`,
  `src/renderer/features/browser/lib/browser-error.ts`): a failed load
  reports a signed numeric Chromium error code, a description string
  (e.g. `ERR_NAME_NOT_RESOLVED`), the URL, and whether it was the main
  frame (a broken iframe is the page's own problem and is ignored); a
  renderer crash is reported as its own event. Classifying a code into
  one of seven shown kinds (`no-internet`, `site-not-found`,
  `site-unreachable`, `insecure-certificate`, `blocked`, `page-crashed`,
  `unknown`) and filtering out the "aborted, not failed" code (`-3`) is
  pure app code today (`classifyLoadError`) and needs nothing from this
  request beyond the raw code, description, URL and main-frame flag —
  it does not need Chain to know what any code means.
- **Navigation and popup policy**
  (`src/main/browser/preview-guard.ts`): every guest's attempt to leave
  for another page or open a new window is intercepted before it
  happens, decided by app code, and only then allowed, redirected
  (handed to the system's own browser instead), turned into a new tab in
  the app's own strip, or held back for the user to approve from a
  notice. The decision needs, per attempt: the destination URL; the
  URL of the document that is navigating or that asked for the new
  window; whether that document is the guest's top-level frame or a
  nested one; whatever real signal exists for the modifier keys and
  mouse button held by the action that opened a new window, so the app
  can derive its own foreground/background intent the way Chromium's
  disposition hint already let it; and whether the guest
  has reported genuine user input (a click, a keypress — not mouse
  movement) in roughly the last few seconds, so a click opening a new
  tab can be told apart from a page redirecting itself on a timer with
  nobody touching it. A window opened with no address yet
  (`window.open()` then set a moment later) is held, hidden, until its
  first real navigation arrives, then judged the same way.
- **Permission policy**
  (`src/main/browser/browser-permissions.ts`): a page in the browser
  session may ask for fullscreen, pointer lock, keyboard lock, DRM
  (`mediaKeySystem`) and a sanitized clipboard write, and nothing else —
  every other permission (notifications, camera, microphone, geolocation,
  full clipboard read, …) is refused without ever showing the engine's
  own prompt UI, both for a one-off request and for the synchronous
  "what's my current permission" read a page's own script makes.
- **Two-finger swipe navigation**
  (`src/main/browser/swipe-navigation.ts`): a gesture detected inside the
  guest moves that guest's own history back or forward and drives an
  on-screen indicator the app draws, fed by the gesture's direction,
  progress and velocity as it happens.
- **History and "send to an agent"** are both already pure app code with
  no native dependency beyond what's above: history is a capped list the
  app keeps itself from the navigation events it already gets; sending a
  page to an agent only ever sends the current tab's URL and title (typed
  into the agent's own terminal, unsubmitted), never the page's content.

## What Lazify needs

A guest's own identity, its session name, and every event/call below are
per-guest — the app opens, closes and switches between several at once
(its tabs), and nothing here is a singleton.

- **Create and host a guest.** Content from a URL, rendered inside the
  app's own window at a position, size, and visibility the app
  controls (shown, hidden, resized with the rest of the layout) — not a
  separate OS window. Close it independently of the app's own window.
- **Named, persistent sessions**, the same shape `desktop.browser`
  already has: cookies and site storage kept between launches, isolated
  from the app's own webview and from every other named session. Two
  names are needed today (the browser's own, and the preview's), used
  by every browser tab and the preview respectively — more may follow
  later without changing the shape.
- **Navigation control**: load a URL, go back, go forward, reload, stop;
  read whether back/forward are currently possible.
- **State events**, per guest: a load starting and finishing; a
  navigation (including in-page/history-API navigation) completing,
  with the URL it landed on; the page's title changing; a failed load
  (numeric error code, description string, the URL, and whether it was
  the guest's main frame — a nested frame's failure is the app's to
  ignore, not Chain's); the guest's own content process having crashed
  or gone away.
- **A way to decide navigation and new windows before they happen**,
  rather than only hear about them after: the app needs to be told,
  as an event it can still answer in time to cancel the attempt,
  whenever a guest is about to leave for another address (including one
  a nested frame is trying to force on its top-level guest) or is about
  to open a new window, and be able to refuse it, letting the app
  redirect the user elsewhere instead (its own new tab, the system's
  browser) rather than have the engine open anything on its own. Each
  ask needs to carry: the destination URL; the URL of the frame/document
  responsible; whether that's the guest's main frame; for a new window,
  whatever real signal exists for the modifier keys and mouse button
  held when it was triggered, so the app can tell a foreground open from
  a background one itself; and whether the guest has seen a real input
  event (not pointer movement) recently enough to count as the user's
  own doing. A new window with no address
  yet needs to be held — not shown, not destroyed — until it either gets
  a first real navigation (then judged the same way) or a timeout passes
  with none (then dropped).
- **Permission policy, but fixed, not asked each time.** Lazify's own
  policy is a static allow-list — fullscreen, pointer lock, keyboard
  lock, DRM and a sanitized clipboard write are always on; everything
  else (camera, microphone, geolocation, notifications, a full
  clipboard read, …) is always off, for every site, with no per-site
  exception and no prompt of the engine's own ever shown. So this
  doesn't need a per-request decision hook — a fixed set of capability
  toggles chosen when a guest is created is enough.
- **Two-finger swipe**: a gesture happening inside a guest, delivered to
  the app as it happens (direction, progress, velocity), so the app can
  draw its own indicator and decide whether to move the guest's history.
- **No app content loaded as a guest, and no guest preload/Node access**:
  a guest never runs with the app's own webview's privileges, and a
  guest can't create a nested guest of its own.

## macOS and Windows

Verified only on macOS, in Electron. Not verified on Windows — this
app's first release is macOS-only regardless (D-2), so Windows parity
here is not blocking.

## Open questions — resolved 2026-10-15

chain-sdk looked at this against the real macOS WebKit APIs (not only
docs) and came back with two platform facts that changed this request;
both are reflected above already.

- **The navigation/popup decision is an out-of-band event, not a
  blocking call.** WebKit's own navigation-decision API already holds a
  callback and invokes it whenever, sync or async; wry's own new-window
  handling moves to a separate thread on Windows specifically to dodge
  the deadlock a blocking call would risk there (WebView2 has the same
  async model). An event mirrors what the platform already does on both
  sides.
- **WebKit has no "recent genuine user input" flag of its own** —
  Chromium's sticky activation, which Electron surfaces, has no WebKit
  equivalent. It has to be inferred app-side from a raw, per-guest
  timestamped input stream (pointer-down/key-down, never movement),
  which the app was always going to need anyway for recognising a real
  click in the first place.
- **WebKit has no "disposition" (foreground/background/new-window) at
  all** — that's Chromium computing it for Electron, not something the
  platform hands over. What WebKit does give is the modifier keys and
  mouse button held by the action that triggered the new window, plus
  the window-feature hints (shown, resizable, size) the page asked for;
  the app derives its own foreground/background intent from those, the
  same way Chromium's own computation does.
- **Of the five permissions in Lazify's allow-list, only camera,
  microphone and geolocation have a real per-request decide hook in
  WebKit** (confirmed by listing `WKUIDelegate`'s methods at runtime,
  not from docs); fullscreen and DRM are config toggles chosen once when
  a guest is created, not a per-ask decision; pointer lock and keyboard
  lock aren't confirmed to work in `WKWebView` yet; a clipboard write
  during a real gesture isn't gated by WebKit at all. This turned out
  not to matter: Lazify's policy for all five is a static allow/deny
  that never varies by site (see above), so the creation-time toggles
  WebKit does offer are enough on their own, and the one real per-request
  hook (camera/mic/geolocation) isn't needed since Lazify always answers
  it the same way anyway.

## What's next, pinned down ahead of time (2026-10-16)

Still not part of this request — Lazy Shield and media picture-in-picture
each stay their own request, filed once this one is built and there's a
real guest to build against. This section exists so the embedding
primitive's shape doesn't have to be revisited once that happens; it's
exactly what each one needs from *this* request, read from Electron's
source (`src/main/browser/lazy-shield.ts`, 380 lines;
`src/main/media/media-pip.ts`, 108 lines), not speculation.

- **Lazy Shield's network half needs the same per-request information a
  blocking webRequest hook gets in Electron**: the destination URL, the
  resource type (document, script, image, stylesheet, xhr/fetch, font,
  media, websocket, ping, other — Chromium's own list, which the
  underlying filter library's matching is written against), the
  initiating frame's URL, whether that frame is the guest's main frame,
  and the HTTP method. The decision needs to come back before the
  request is sent: allow, cancel, or (rare, and only for a response
  Electron itself can carry out — see the `honourable()` comment in
  `lazy-shield.ts` for why a `data:` redirect from this exact library
  fails outright in Electron, which is probably platform-specific
  rather than universal and worth re-checking once there's a WebKit
  guest to try it against) redirect to a substitute body. A second,
  separate hook reads response headers before they reach the page (for
  rules that key off the response rather than the request) — same
  shape, allow-or-modify rather than allow-or-cancel.
- **Lazy Shield's cosmetic half needs the guest to run an app-supplied
  script and talk back to the host.** After a page's content is ready,
  a script needs to run *inside* the guest (not the host) that can ask
  the host "what should this page hide" (by URL) and get back a set of
  CSS selectors/rules, then apply them to the DOM in the guest itself.
  This is two things request 18 alone doesn't cover: running
  app-supplied script inside a guest's own context, and a request/response
  channel from that script back to the host app (today's
  `ipcMain.handle` pair in Electron). It needs to run once per
  navigation, not once per guest's lifetime — the same page's SPA
  navigation to a new in-page URL needs its own answer.
- **Media picture-in-picture needs nothing beyond running
  app-supplied script in a guest frame and reading back its return
  value** — the floating player itself is the Web Platform's own
  `Element.requestPictureInPicture()`/`document.exitPictureInPicture()`,
  called *from inside* the guest by a script the host injects, walked
  over the guest's main frame and every nested frame until one answers
  (a `<video>` can be in an ad network's iframe, not the top page).
  **This is the same "run a script in the guest, get the result" need
  cosmetic filtering above already has** — if request 18's own contract
  ends up offering a generic "execute this script in the guest (or one
  of its frames) and resolve with what it returns" primitive for any
  reason, both of these later requests become almost free; if it
  doesn't, both will ask for it separately.
- **A third, bigger thing Electron also calls "picture-in-picture"
  isn't the media kind above, and doesn't obviously belong to this
  request at all**: popping the *whole page* (not a video — a dev
  server's preview, say) out into its own small, always-on-top OS
  window, one at a time, sharing the same named session as wherever it
  came from (`src/main/media/picture-in-picture.ts`, 169 lines). That's
  closer in shape to today's `desktop.browser` (a separate OS window)
  than to an embedded guest — except `desktop.browser` can't share a
  session with an embedded guest today, can't stay always-on-top, and
  restricts navigation in ways this doesn't need. Likely its own
  request building on both capabilities once they exist, not this one
  — named here only so it isn't mistaken for the media case above when
  it comes up.
- **Isolation and storage are already specified above** (named,
  persistent sessions; no app-origin content; no nested guest) and
  don't need anything further for either Lazy Shield or PiP — Lazy
  Shield's network/cosmetic hooks are scoped to one named session only
  (the browser's, never the preview's) using exactly the session
  identity this request already asks for.
- **Placement and sizing are already specified above** too (position,
  size and visibility the app controls, shown/hidden/resized with the
  rest of the layout) — nothing from Lazy Shield or PiP needs more than
  that. Electron's own embedding (`BrowserGuest.tsx`) keeps every open
  tab's guest alive and stacks them with `z-index` rather than
  mounting/unmounting on switch, which is already implied by "closed
  independently of the app's own window" plus ordinary visibility
  control, not a new ask.
