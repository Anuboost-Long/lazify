/**
 * Address-bar input handling for the browser page.
 *
 * Unlike the agent preview — which only ever loads a dev server and refuses
 * everything else — this bar takes whatever the user types. Anything that does
 * not read as an address becomes a search, which is what a browser does.
 */

/** Where non-URL input goes. */
const SEARCH_URL = "https://duckduckgo.com/?q=";

/** Schemes worth loading. `file:` is deliberately absent. */
const ALLOWED_SCHEMES = new Set(["http:", "https:", "about:"]);

/** Looks like a bare host: `example.com`, `localhost:3000`, `1.2.3.4`. */
const BARE_HOST = /^[\w-]+(\.[\w-]+)*(:\d{2,5})?(\/\S*)?$/;

/** True when the string names a host rather than a search phrase. */
function looksLikeHost(input: string): boolean {
  if (!BARE_HOST.test(input)) return false;
  // A dot or an explicit port is what separates `example.com` and `localhost:3000`
  // from a single word the user meant to search for.
  return input.includes(".") || /^localhost(:|\/|$)/.test(input);
}

/** Turns address-bar input into a URL to load. Never returns null. */
export function resolveBrowserInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "about:blank";

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (ALLOWED_SCHEMES.has(url.protocol)) return url.href;
    } catch {
      // Falls through to search — a malformed scheme is not an address.
    }
    return SEARCH_URL + encodeURIComponent(trimmed);
  }

  if (looksLikeHost(trimmed)) return `https://${trimmed}`;

  return SEARCH_URL + encodeURIComponent(trimmed);
}

/** Host shown on a tab, falling back to the raw URL when there is none. */
export function tabLabel(url: string): string {
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol === "about:") return "New tab";
    return hostname.replace(/^www\./, "") || url;
  } catch {
    return url;
  }
}
