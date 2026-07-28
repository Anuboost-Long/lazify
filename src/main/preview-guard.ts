import { app, session, shell, type WebContents } from "electron";

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

function wireBrowserGuest(
  contents: WebContents,
  onOpenTab: (url: string, background: boolean) => void
): void {
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
          webPreferences: { nodeIntegration: false, contextIsolation: true }
        }
      };
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
      if (!isBlankTarget(url)) onOpenTab(url, background);
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
  onOpenTab: (url: string, background: boolean) => void
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
      wireBrowserGuest(contents, onOpenTab);
      return;
    }

    // Anything that is not explicitly the browser is treated as the preview.
    // A new surface has to opt in to the open web, never inherit it.
    lockDownPreviewGuest(contents);
  });
}
