import { app, ipcMain, session } from "electron";
import fs from "node:fs";
import path from "node:path";

import { ElectronBlocker } from "@ghostery/adblocker-electron";
import { BROWSER_PARTITION } from "./preview-guard";

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
    const engine = await loadBlocker();

    ses.webRequest.onBeforeRequest(ALL_URLS, engine.onBeforeRequest);
    ses.webRequest.onHeadersReceived(ALL_URLS, engine.onHeadersReceived);

    // Cosmetic side: the guest preload asks main what to hide and what to
    // inject, over these two channels.
    ipcMain.handle(COSMETIC_CHANNEL, engine.onInjectCosmeticFilters);
    ipcMain.handle(MUTATION_CHANNEL, engine.onIsMutationObserverEnabled);
    ses.setPreloads([PRELOAD_PATH]);

    enabled = true;
  } else {
    // Passing null is how a webRequest listener is detached; the session then
    // behaves exactly as it did before the shield was ever raised.
    ses.webRequest.onBeforeRequest(null);
    ses.webRequest.onHeadersReceived(null);

    ses.setPreloads([]);
    ipcMain.removeHandler(COSMETIC_CHANNEL);
    ipcMain.removeHandler(MUTATION_CHANNEL);

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
    console.error("[lazy-shield] failed to enable at startup:", error);
  }
}
