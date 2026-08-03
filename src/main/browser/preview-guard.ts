import { app, session, shell, type WebContents } from "electron";

import { isCrossSite, isPopupOpenerAllowed, type BlockedPopup } from "./popup-policy";

/**
 * Policy for every `<webview>` the app embeds. There are two, and they are
 * deliberately not alike:
 *
 *  - The agent preview shows what a project serves on localhost, so loopback is
 *    all it may load. A link that leads off the machine is not an error — it is
 *    just not that panel's job, so it leaves for the user's real browser.
 *  - The browser page is a browser: it goes wherever the user asks.
 *
 * They never share a session. The preview loads dev servers an agent may have
 * just written, and those must not be able to reach cookies belonging to sites
 * the user is signed into on the browser page.
 */

/** Session for the agent preview — loopback only, and isolated. */
export const PREVIEW_PARTITION = "persist:lazify-preview";

/** Session for the browser page — the open web, with logins that persist. */
export const BROWSER_PARTITION = "persist:lazify-web";

/** Hosts a dev server can realistically answer on. */
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

/** True when the URL points at a server on this machine. */
export function isLoopbackUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;

    const host = url.hostname.toLowerCase();
    // `*.localhost` resolves to loopback too, which is how some dev servers
    // hand out per-project subdomains.
    return LOOPBACK_HOSTS.has(host) || host.endsWith(".localhost");
  } catch {
    return false;
  }
}

/** Hands http(s) URLs to the system browser; anything else is dropped. */
export function openExternalUrl(raw: string): void {
  try {
    const { protocol } = new URL(raw);
    if (protocol === "http:" || protocol === "https:") void shell.openExternal(raw);
  } catch {
    // A malformed URL has nowhere to go.
  }
}

function lockDownPreviewGuest(contents: WebContents): void {
  // In-page navigation: only loopback stays inside the preview. The rest is
  // handed to the real browser rather than dropped.
  contents.on("will-navigate", (event, url) => {
    if (isLoopbackUrl(url)) return;
    event.preventDefault();
    openExternalUrl(url);
  });

  // target="_blank" and window.open never get their own window — a popup with
  // no chrome would be a dead end inside the panel.
  contents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url);
    return { action: "deny" };
  });
}

/**
 * True for a popup opened without an address. The pattern is
 * `const w = window.open(); w.location = url` — sites reach for it so the
 * window is created inside the click's user gesture and the address arrives a
 * moment later, often after an await.
 */
function isBlankTarget(url: string): boolean {
  return !url || url === "about:blank";
}

/** How long a blank popup has to say where it is going before it is dropped. */
const BLANK_POPUP_GRACE_MS = 10_000;

/**
 * How long after a click or a keypress a page may still be taken to be acting
 * on it. Long enough for a click that has to ask a server where it is going;
 * far short of the pause an ad loader waits out before it moves the page.
 */
const USER_ACTIVATION_MS = 3_000;

/**
 * Input that counts as the user doing something. Movement and scrolling do not:
 * a page must not be able to bank a departure against a mouse crossing it.
 */
const ACTIVATING_INPUT = new Set([
  "mouseDown",
  "keyDown",
  "rawKeyDown",
  "char",
  "touchStart",
  "gestureTapDown"
]);

function wireBrowserGuest(
  contents: WebContents,
  onOpenTab: (url: string, background: boolean) => void,
  isBlockedPopup: (url: string, sourceUrl: string) => boolean,
  onBlockedPopup: (blocked: BlockedPopup) => void
): void {
  /**
   * Whether a popup may become a tab on its own.
   *
   * Three answers, in the order they are cheap to give: the filter lists refuse
   * outright, a popup to the site the user is already on is the site's own doing
   * and passes, and anything leading elsewhere is held for the user unless they
   * have already trusted this site with popups.
   */
  const deliver = (url: string): boolean => {
    const sourceUrl = contents.getURL();
    if (isBlockedPopup(url, sourceUrl)) return false;
    if (!isCrossSite(url, sourceUrl)) return true;
    if (isPopupOpenerAllowed(sourceUrl)) return true;

    onBlockedPopup({ url, sourceUrl, kind: "popup" });
    return false;
  };

  // When the user last did something the page could reasonably be acting on.
  // Chromium knows this as transient user activation and does not offer it to
  // main, so it is kept here from the input the guest receives.
  let lastInputAt = 0;
  /**
   * Whether this guest has ever reported input at all.
   *
   * The rule below reads silence as "the user did not do this", so it must not
   * read silence that means "nothing is telling us". Input routed to a guest
   * arrives through Chromium's hit-test router, and a build or platform where
   * that never surfaces here would otherwise turn every outbound link into a
   * blocked one. Until a first event proves the signal exists, the rule holds
   * its tongue and only the frame check below applies.
   */
  let inputSignalWorks = false;

  contents.on("input-event", (_event, input) => {
    if (!ACTIVATING_INPUT.has(input.type)) return;
    inputSignalWorks = true;
    lastInputAt = Date.now();
  });

  /**
   * The page is leaving for another site. Whether that is the user's doing.
   *
   * A click or a keypress moments ago is taken at face value — that is a link
   * being followed, and nothing here can tell a real one from a hijacked one.
   * What it will not do is let a single click stand as consent for a stream of
   * departures, so the activation is spent when it is used, exactly as a
   * browser spends it on a popup.
   */
  const consumeUserActivation = (): boolean => {
    if (!inputSignalWorks) return true;
    if (Date.now() - lastInputAt > USER_ACTIVATION_MS) return false;
    lastInputAt = 0;
    return true;
  };

  // The page leaving for another site on its own account. This is the shape of
  // the redirect an ad loader arms on a timer: the user is watching something,
  // touching nothing, and the tab becomes a betting site or an affiliate link.
  //
  // Same-site navigation is the site's own business and never inspected. What
  // is left — a departure to somewhere else — has to be attributable to the
  // user: the address bar, an allowance they granted, or something they just
  // did. A frame reaching out to steer the page it is embedded in is never
  // attributable, whatever the timing, since the click that "authorised" it
  // landed on a video player.
  contents.on("will-frame-navigate", (event) => {
    if (!event.isMainFrame) return;

    const { initiator, frame, url } = event;
    if (!frame) return;
    if (!isCrossSite(url, frame.url)) return;
    if (isPopupOpenerAllowed(frame.url)) return;

    // No initiator at all means no page asked for this: the address bar, a
    // bookmark, history, session restore. Those are the user by definition.
    if (!initiator) return;

    if (initiator === frame && consumeUserActivation()) return;

    event.preventDefault();
    onBlockedPopup({ url, sourceUrl: frame.url, kind: "redirect" });
  });

  // Navigation is unrestricted here — this one is a browser. What a popup must
  // not do is escape into a chromeless window, so it becomes a tab instead.
  //
  // Chromium reports how the link was activated. A plain `target="_blank"` means
  // the user wants to be taken there; a modified click — cmd, ctrl, middle
  // button — means they want it waiting for them. Passing that through is the
  // difference between a browser and a popup catcher.
  contents.setWindowOpenHandler((details) => {
    // Nothing to open a tab at yet. Denying returns null to the opener, which
    // loses the address it was about to set, so the window is allowed — hidden —
    // purely to find out where it was headed.
    if (isBlankTarget(details.url)) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          show: false,
          // Kept in the browser's own session. Without the partition this
          // window lands in the default one, where the shield is not attached,
          // and it spends its short life loading whatever it likes unfiltered.
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            partition: BROWSER_PARTITION
          }
        }
      };
    }

    // A popup the policy refuses is denied outright. Turning it into a tab would
    // launder it past the shield, because the filter never cancels a main frame.
    if (!deliver(details.url)) {
      return { action: "deny" };
    }

    onOpenTab(details.url, details.disposition === "background-tab");
    return { action: "deny" };
  });

  // The other half of the blank-popup case: take its first real navigation as
  // the tab's address and drop the window it would otherwise have become.
  contents.on("did-create-window", (window, details) => {
    const background = details.disposition === "background-tab";
    let timer: NodeJS.Timeout | undefined;
    let settled = false;

    const settle = (url: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // Where the popunder pattern is caught: the address only shows up now, so
      // this is the first point at which the policy can be asked about it.
      if (!isBlankTarget(url) && deliver(url)) {
        onOpenTab(url, background);
      }
      if (!window.isDestroyed()) window.destroy();
    };

    window.webContents.on("will-navigate", (event, url) => {
      event.preventDefault();
      settle(url);
    });

    // A handle the opener never navigates would otherwise sit there, hidden,
    // for the life of the app.
    timer = setTimeout(() => settle(""), BLANK_POPUP_GRACE_MS);

    window.on("closed", () => {
      settled = true;
      clearTimeout(timer);
    });
  });
}

/**
 * Registers the policy for every `<webview>` the app creates, dispatched by the
 * session the guest was given. Called once at startup, before any window exists.
 *
 * @param onOpenTab Asks the browser page to open a URL a guest tried to pop out.
 * `background` carries the user's intent: a modified click wants the tab
 * waiting for them, not in front of them.
 */
export function guardPreviewWebviews(
  onOpenTab: (url: string, background: boolean) => void,
  isBlockedPopup: (url: string, sourceUrl: string) => boolean,
  onBlockedPopup: (blocked: BlockedPopup) => void
): void {
  app.on("web-contents-created", (_event, contents) => {
    // The host side: the guest gets no preload and no Node, whatever attributes
    // the renderer put on the tag. A guest may not nest a guest of its own.
    contents.on("will-attach-webview", (event, webPreferences) => {
      if (contents.getType() === "webview") {
        event.preventDefault();
        return;
      }

      delete webPreferences.preload;
      webPreferences.nodeIntegration = false;
      webPreferences.contextIsolation = true;
    });

    if (contents.getType() !== "webview") return;

    // Sessions are singletons per partition, so identity is the reliable test —
    // the tag's attributes are renderer-supplied and this runs in main.
    if (contents.session === session.fromPartition(BROWSER_PARTITION)) {
      wireBrowserGuest(contents, onOpenTab, isBlockedPopup, onBlockedPopup);
      return;
    }

    // Anything that is not explicitly the browser is treated as the preview.
    // A new surface has to opt in to the open web, never inherit it.
    lockDownPreviewGuest(contents);
  });
}
