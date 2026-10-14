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
  nested one; Chromium's own disposition hint for a new window
  (foreground tab / background tab / new window); and whether the guest
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
  rather than only hear about them after: the app needs to be asked,
  synchronously enough to still cancel the attempt, whenever a guest is
  about to leave for another address (including one a nested frame is
  trying to force on its top-level guest) or is about to open a new
  window, and be able to refuse it, letting the app redirect the user
  elsewhere instead (its own new tab, the system's browser) rather than
  have the engine open anything on its own. Each ask needs to carry: the
  destination URL; the URL of the frame/document responsible; whether
  that's the guest's main frame; for a new window, the engine's
  foreground/background/new-window disposition hint; and whether the
  guest has seen a real input event (not pointer movement) recently
  enough to count as the user's own doing. A new window with no address
  yet needs to be held — not shown, not destroyed — until it either gets
  a first real navigation (then judged the same way) or a timeout passes
  with none (then dropped).
- **Permission policy**: be asked, per guest and per permission name
  (e.g. `notifications`, `geolocation`, `clipboard-read`,
  `media-key-system`, `fullscreen`, …), both for a one-off request a page
  makes and for the synchronous check a page's own script can make
  against its current state, and answer allow or deny — with no default
  prompt UI of the engine's own ever shown in either case.
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

## Open questions for chain-sdk

- Whether the per-guest navigation/popup decision above is a blocking
  call native waits on (mirroring `agentServer`'s own "native blocks,
  JS answers" shape) or an event the app answers out of band before
  acting — either serves the need; the contract's shape is Chain's call
  (rule 2).
- Whether "genuine recent user input" is something native can report
  itself (it already has to route input to the right guest) or something
  the app is left to infer from whatever input events it's given.
