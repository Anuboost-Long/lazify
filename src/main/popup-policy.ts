import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

/**
 * Popup policy for the browser page.
 *
 * The filter lists catch popups they happen to name, and that is not most of
 * them: a site that wants a popunder registers a fresh domain the morning it
 * needs one. What every one of them has in common is that it leads somewhere
 * other than the site the user is reading — the click was on a play button and
 * the window that opened belongs to a bookmaker.
 *
 * So the test here is not reputation but relation. A popup to the site you are
 * already on opens as a tab and you never hear about it; one to a different
 * site is held back and offered in the notice strip, where opening it is a
 * click away. Nothing is silently thrown out, because the same shape — a click
 * that opens another site in a new window — is also how signing in with Google
 * works.
 *
 * A site the user says they trust with popups is remembered, so an app whose
 * login flow needs one asks once rather than every time.
 */

/**
 * Suffixes under which registrations happen, so `bbc.co.uk` is a site and
 * `co.uk` is not. Deliberately short: it covers what a user in this app is
 * likely to hit, and getting one wrong only means a popup is held back and
 * offered rather than opened outright.
 */
const MULTI_LABEL_SUFFIXES = new Set([
  "co.uk", "org.uk", "ac.uk", "gov.uk", "co.jp", "or.jp", "ne.jp",
  "com.au", "net.au", "org.au", "com.br", "com.cn", "com.hk", "com.tw",
  "co.in", "co.kr", "co.nz", "co.za", "com.mx", "com.sg", "com.tr", "com.kh"
]);

/**
 * The registrable part of a URL's host — what "the same site" means here.
 * Empty when the URL has no host to speak of, which is treated as cross-site.
 */
export function siteOf(raw: string): string {
  try {
    const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
    const labels = host.split(".");
    if (labels.length <= 2) return host;

    const lastTwo = labels.slice(-2).join(".");
    return MULTI_LABEL_SUFFIXES.has(lastTwo)
      ? labels.slice(-3).join(".")
      : lastTwo;
  } catch {
    return "";
  }
}

/** True when the two URLs do not belong to the same registrable site. */
export function isCrossSite(url: string, sourceUrl: string): boolean {
  const target = siteOf(url);
  const source = siteOf(sourceUrl);
  // An unreadable address on either side is not something to vouch for.
  if (!target || !source) return true;
  return target !== source;
}

// ── Per-site allowance ──────────────────────────────────────────────────────
// Keyed by the site doing the opening, not the one being opened: the user's
// answer is "this site may open popups", the same thing a browser remembers.

const ALLOW_FILE = "popup-allowlist.json";
const allowPath = () => path.join(app.getPath("userData"), ALLOW_FILE);

let allowed: Set<string> | null = null;

function loadAllowed(): Set<string> {
  if (allowed) return allowed;

  try {
    const raw = JSON.parse(fs.readFileSync(allowPath(), "utf8")) as { sites?: string[] };
    allowed = new Set(Array.isArray(raw.sites) ? raw.sites : []);
  } catch {
    allowed = new Set();
  }

  return allowed;
}

/** True when the page asking to open a popup has been trusted with them. */
export function isPopupOpenerAllowed(sourceUrl: string): boolean {
  const site = siteOf(sourceUrl);
  return site !== "" && loadAllowed().has(site);
}

/** Remembers that the page's site may open popups from now on. */
export function allowPopupsFrom(sourceUrl: string): void {
  const site = siteOf(sourceUrl);
  if (!site) return;

  const sites = loadAllowed();
  if (sites.has(site)) return;
  sites.add(site);

  try {
    fs.writeFileSync(allowPath(), JSON.stringify({ sites: [...sites] }));
  } catch {
    // The allowance still holds for this run; only its memory is lost.
  }
}

/** What the renderer is told about something held back. */
export interface BlockedPopup {
  /** Where it wanted to go. */
  url: string;
  /** The page it was opened from — what an allowance would be granted to. */
  sourceUrl: string;
  /** A popup asked for a window; a redirect tried to steer the page itself. */
  kind: "popup" | "redirect";
}
