import { app, ipcMain, session } from "electron";
import fs from "node:fs";
import path from "node:path";

import { Request } from "@ghostery/adblocker";
import { ElectronBlocker } from "@ghostery/adblocker-electron";
import { BROWSER_PARTITION } from "./preview-guard";
import { logError } from "../diagnostics/logger";

/**
 * Lazy Shield — request filtering for the browser page.
 *
 * Scoped to the browser session and nothing else. The preview session loads the
 * user's own dev servers, and cancelling requests there would be indistinguishable
 * from a bug in the app they are building — a route that happens to look like an
 * ad path, an analytics script they are mid-way through debugging. It is never
 * touched.
 *
 * Rules are fetched rather than bundled. That keeps upstream lists' licences out
 * of the distribution, and — the practical half — means a filter fix reaches the
 * user without shipping a release.
 *
 * `enableBlockingInSession` is not used: it reaches for `session.registerPreloadScript`,
 * an API newer than the Electron this app runs on. Everything it does is done here
 * instead — the same webRequest handlers, and the same two IPC channels its guest
 * preload talks to, registered against `setPreloads`, which this Electron does have.
 * That keeps cosmetic filtering and scriptlets, which is where site-specific rules
 * live; without them only network-level blocking would work.
 */

/**
 * The adblocker's guest-side preload. Resolved here rather than imported from
 * the library's own `preload_path` module, which its package exports map does
 * not expose — this is the same resolution that module performs.
 */
const PRELOAD_PATH = require.resolve("@ghostery/adblocker-electron-preload");

/** Channels the adblocker's guest preload calls. Names come from the library. */
const COSMETIC_CHANNEL = "@ghostery/adblocker/inject-cosmetic-filters";
const MUTATION_CHANNEL = "@ghostery/adblocker/is-mutation-observer-enabled";

/**
 * Hosts that get network filtering but no cosmetic filtering.
 *
 * YouTube builds its player lazily: the watch page renders, and the player is
 * only constructed once its container is actually on screen. Cosmetic filtering
 * hides elements, and hiding anything the player is waiting behind means it is
 * never built at all — no player element, and not so much as a request for one.
 * It shows on the path through the site rather than a direct load: open the home
 * page and click a video and there is no player, while loading the watch URL
 * outright is fine, which is why reloading appears to "fix" it.
 *
 * Network filtering still applies here in full; only the element hiding is off.
 * A player that works beats an ad slot that is hidden.
 */
const NO_COSMETIC_HOSTS = [/(^|\.)youtube\.com$/, /(^|\.)youtube-nocookie\.com$/];

function cosmeticAllowed(url: string): boolean {
  try {
    return !NO_COSMETIC_HOSTS.some((host) => host.test(new URL(url).hostname));
  } catch {
    // Not a URL we can read; nothing to make an exception for.
    return true;
  }
}

/** webRequest wants an explicit filter; every request is a candidate. */
const ALL_URLS = { urls: ["<all_urls>"] };

/** Compiled engine cache, so a cold start is a disk read rather than a fetch. */
const CACHE_FILE = "lazy-shield-engine.bin";

/** Rules go stale; past this the cache is refreshed in the background. */
const MAX_CACHE_AGE_MS = 3 * 24 * 60 * 60 * 1000;

let blocker: ElectronBlocker | null = null;
let enabled = false;
/** Requests blocked since launch. Reset when the user toggles off. */
let blockedCount = 0;
let notifyCount: ((count: number) => void) | null = null;

const cachePath = () => path.join(app.getPath("userData"), CACHE_FILE);

function browserSession() {
  return session.fromPartition(BROWSER_PARTITION);
}

function readCachedEngine(): ElectronBlocker | null {
  try {
    const file = cachePath();
    const { mtimeMs } = fs.statSync(file);
    if (Date.now() - mtimeMs > MAX_CACHE_AGE_MS) return null;
    return ElectronBlocker.deserialize(new Uint8Array(fs.readFileSync(file)));
  } catch {
    return null;
  }
}

async function fetchEngine(): Promise<ElectronBlocker> {
  // The full set rather than ads+tracking: it carries the annoyance and
  // site-specific rules, which is where anything beyond plain ad domains lives.
  const fresh = await ElectronBlocker.fromPrebuiltFull(fetch);
  try {
    fs.writeFileSync(cachePath(), Buffer.from(fresh.serialize()));
  } catch {
    // A cache we cannot write just means the next start fetches again.
  }
  return fresh;
}

/** Builds the engine once, preferring a warm cache. */
async function loadBlocker(): Promise<ElectronBlocker> {
  if (blocker) return blocker;

  blocker = readCachedEngine() ?? (await fetchEngine());

  blocker.on("request-blocked", () => {
    blockedCount += 1;
    notifyCount?.(blockedCount);
  });

  return blocker;
}

/** In flight while the engine is being built; shared by everything waiting. */
let building: Promise<ElectronBlocker> | null = null;

function engineReady(): Promise<ElectronBlocker> {
  building ??= loadBlocker();
  return building;
}

/** How long a request waits for a cold engine before it is let through. */
const HOLD_LIMIT_MS = 5000;

/**
 * The engine for a request that arrived before it was built — or null when it
 * has taken long enough that holding the page is the worse failure of the two.
 *
 * The build carries on regardless, so the wait is paid once, by whatever loads
 * during a cold start, and never again.
 */
function engineForRequest(): Promise<ElectronBlocker | null> {
  if (blocker) return Promise.resolve(blocker);

  return Promise.race([
    engineReady().catch(() => null),
    new Promise<null>((resolve) => {
      // Unreferenced so a pending hold can never be what keeps the app alive.
      setTimeout(() => resolve(null), HOLD_LIMIT_MS).unref?.();
    })
  ]);
}

/**
 * Puts the filtering handlers in place, before the engine they will use exists.
 *
 * Attaching only once the engine is ready looks tidier and is wrong: building it
 * means a disk read at best and a list fetch at worst, and the browser page does
 * not wait — a restored tab starts loading the moment the window does. The
 * handlers would then land partway through that load, and the page would be
 * filtered from whichever request happened to arrive next.
 *
 * Half-filtered is its own kind of broken, and worse than either extreme. A
 * video page whose first scripts arrived unfiltered and whose later ones did not
 * ends up with a player that never starts — and no amount of waiting fixes it,
 * because the load it needed already happened. Reloading by hand appears to fix
 * "the site" only because the second load is consistent from its first byte.
 *
 * So: attach now, and hold anything that arrives early until the engine can
 * answer for it. Requests that arrive after it is built pay nothing.
 */
/**
 * Drops a response Electron cannot carry out, rather than passing it on.
 *
 * `$redirect` rules do not cancel a request — they answer it with a stub, as a
 * `data:` URL, so the page carries on believing the resource loaded. That is
 * the entire point of them: neutralise without breaking. Chromium refuses a
 * webRequest redirect to `data:` outright, so what reaches the page instead is
 * `ERR_UNSAFE_REDIRECT` — a failed load, the one outcome those rules exist to
 * avoid.
 *
 * YouTube is where this shows: its player asks for an ad-status probe before
 * building itself, and a probe that fails is not the same as one answered with
 * a stub. The player is simply never created, and no amount of waiting helps —
 * reloading only appears to fix "the site" because the page is then built down
 * a path that does not ask.
 *
 * So a redirect that cannot be performed is treated as no rule at all. Blocking
 * outright is not the safer choice it looks like: a page cannot tell a
 * cancelled script from a broken one, so it would fail in exactly the same way.
 */
function honourable(callback: (response: Electron.CallbackResponse) => void) {
  return (response: Electron.CallbackResponse) => {
    if (response.redirectURL?.startsWith("data:")) {
      callback({});
      return;
    }

    callback(response);
  };
}

function attachFiltering(ses: Electron.Session) {
  ses.webRequest.onBeforeRequest(ALL_URLS, (details, callback) => {
    const answer = honourable(callback);

    if (blocker) {
      blocker.onBeforeRequest(details, answer);
      return;
    }

    // A shield that could not be built in time must not also swallow the page.
    void engineForRequest().then((engine) => {
      if (engine) engine.onBeforeRequest(details, answer);
      else answer({});
    });
  });

  ses.webRequest.onHeadersReceived(ALL_URLS, (details, callback) => {
    if (blocker) {
      blocker.onHeadersReceived(details, callback);
      return;
    }

    void engineForRequest().then((engine) => {
      if (engine) engine.onHeadersReceived(details, callback);
      else callback({});
    });
  });

  // Cosmetic side: the guest preload asks main what to hide and what to
  // inject, over these two channels. Registered against the same wait, so a
  // guest that starts early is answered rather than thrown an error.
  ipcMain.handle(COSMETIC_CHANNEL, async (event, url: string, msg) => {
    if (!cosmeticAllowed(url)) return;

    const engine = await engineForRequest();
    if (engine) await engine.onInjectCosmeticFilters(event, url, msg);
  });
  ipcMain.handle(MUTATION_CHANNEL, async (event) => {
    const engine = await engineForRequest();
    return engine ? engine.onIsMutationObserverEnabled(event) : false;
  });
  ses.setPreloads([PRELOAD_PATH]);
}

function detachFiltering(ses: Electron.Session) {
  // Passing null is how a webRequest listener is detached; the session then
  // behaves exactly as it did before the shield was ever raised.
  ses.webRequest.onBeforeRequest(null);
  ses.webRequest.onHeadersReceived(null);

  ses.setPreloads([]);
  ipcMain.removeHandler(COSMETIC_CHANNEL);
  ipcMain.removeHandler(MUTATION_CHANNEL);
}

/**
 * Whether a popup should be refused rather than turned into a tab.
 *
 * Popups never reach the request filter. `setWindowOpenHandler` decides before
 * any request exists, and the engine allows every main frame on purpose — it
 * must never cancel the page the user asked for. Both are right on their own,
 * and together they leave a hole: a popup promoted to a tab arrives as a main
 * frame, which the filter then waves through. An ad that could not load in an
 * iframe loads perfectly well in a tab it was handed.
 *
 * So the engine is asked directly here, against the same lists, before the
 * popup is given anywhere to go. A blocked one counts towards the shield's
 * tally like any other — it is the same rule doing the same job.
 */
export function shouldBlockPopup(url: string, sourceUrl: string): boolean {
  if (!enabled || !blocker || !url) return false;

  // Typed as a document: a popup is a page load, and `$popup` and `$document`
  // rules are written against exactly that.
  const { match } = blocker.match(
    Request.fromRawDetails({ type: "document", url, sourceUrl })
  );

  if (match) {
    blockedCount += 1;
    notifyCount?.(blockedCount);
  }

  return match;
}

export interface LazyShieldState {
  enabled: boolean;
  /** False until the engine has been built, which the first enable awaits. */
  ready: boolean;
  blocked: number;
}

export function getLazyShieldState(): LazyShieldState {
  return { enabled, ready: blocker !== null, blocked: blockedCount };
}

/**
 * Turns filtering on or off for the browser session.
 * Enabling the first time builds the engine, so it is awaited.
 */
export async function setLazyShieldEnabled(next: boolean): Promise<LazyShieldState> {
  if (next === enabled) return getLazyShieldState();

  const ses = browserSession();

  if (next) {
    // Ahead of the engine on purpose — see `attachFiltering`. Marked enabled
    // straight away too, so a page loading right now is already covered rather
    // than covered from whenever the build finishes.
    attachFiltering(ses);
    enabled = true;

    try {
      await engineReady();
    } catch (error) {
      // Down rather than pretending to a protection that is not there. The
      // requests held while it was building were let through as they failed.
      building = null;
      detachFiltering(ses);
      enabled = false;
      throw error;
    }
  } else {
    detachFiltering(ses);

    enabled = false;
    blockedCount = 0;
    notifyCount?.(0);
  }

  persistPreference(enabled);
  return getLazyShieldState();
}

// ── Preference ──────────────────────────────────────────────────────────────
// Kept in main rather than the renderer so the shield is up before the first
// page in a restored tab starts loading.

const PREF_FILE = "lazy-shield.json";
const prefPath = () => path.join(app.getPath("userData"), PREF_FILE);

function persistPreference(value: boolean) {
  try {
    fs.writeFileSync(prefPath(), JSON.stringify({ enabled: value }));
  } catch {
    // Not worth failing a toggle over.
  }
}

function readPreference(): boolean {
  try {
    const raw = JSON.parse(fs.readFileSync(prefPath(), "utf8")) as { enabled?: boolean };
    return raw.enabled === true;
  } catch {
    // On by default: a shield the user never asked to lower stays up.
    return true;
  }
}

/**
 * Restores the saved preference at startup. Reports blocked counts through
 * `onCount` so the toolbar can show them live.
 */
export async function initLazyShield(onCount: (count: number) => void): Promise<void> {
  notifyCount = onCount;
  if (!readPreference()) return;

  try {
    await setLazyShieldEnabled(true);
  } catch (error) {
    // A failed list fetch leaves the shield down rather than the app broken;
    // the user can retry from the toolbar.
    logError("lazy-shield", "Failed to enable at startup", error);
  }
}
