/**
 * Address-bar input handling for the browser page.
 *
 * Unlike the agent preview — which only ever loads a dev server and refuses
 * everything else — this bar takes whatever the user types. Anything that does
 * not read as an address becomes a search, which is what a browser does.
 */

import {
  DEFAULT_SEARCH_ENGINE_ID,
  findSearchEngine,
  type SearchEngineId
} from "@renderer/shared/lib/search-engines";

/** Schemes worth loading. `file:` is deliberately absent. */
const ALLOWED_SCHEMES = new Set(["http:", "https:", "about:"]);

/**
 * A scheme the user typed. Refusing one followed by digits is what keeps
 * `localhost:3000` out of it — a host and a port read exactly like a scheme.
 */
const TYPED_SCHEME = /^[a-z][a-z0-9+.-]*:(?!\d)/i;

/** A host, with whatever port, path, query or fragment came after it. */
const BARE_HOST = /^[\w-]+(\.[\w-]+)*\.?(:\d{1,5})?([/?#]\S*)?$/;

/** Ends in something that reads like a domain suffix rather than a number. */
const DOMAIN_SUFFIX = /\.[a-z]{2,}$/i;

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/** This machine, whatever it is called. */
const LOOPBACK = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

/** This network. Neither it nor loopback tends to serve https. */
const PRIVATE_IPV4 = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

/** The host on its own, without the port or anything that followed it. */
function hostOf(input: string): { host: string; port: string } {
  const authority = input.split(/[/?#]/)[0];
  const colon = authority.lastIndexOf(":");

  if (colon === -1) return { host: authority.replace(/\.$/, ""), port: "" };

  return {
    host: authority.slice(0, colon).replace(/\.$/, ""),
    port: authority.slice(colon + 1)
  };
}

/** True when the string names a host rather than a search phrase. */
function looksLikeHost(input: string): boolean {
  if (!BARE_HOST.test(input)) return false;

  const { host, port } = hostOf(input);

  // Nobody writes a port on a phrase they meant to search for.
  if (port) return true;
  if (LOOPBACK.has(host) || IPV4.test(host)) return true;

  // `example.com` is an address; `3.14` and `v1.2` are not.
  return DOMAIN_SUFFIX.test(host);
}

function schemeFor(host: string): string {
  return LOOPBACK.has(host) || PRIVATE_IPV4.test(host) ? "http" : "https";
}

/** Turns address-bar input into a URL to load. Never returns null. */
export function resolveBrowserInput(
  input: string,
  engineId: SearchEngineId = DEFAULT_SEARCH_ENGINE_ID
): string {
  const trimmed = input.trim();
  if (!trimmed) return "about:blank";

  const search = findSearchEngine(engineId).buildSearchUrl;

  if (TYPED_SCHEME.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (ALLOWED_SCHEMES.has(url.protocol)) return url.href;
    } catch {
      // Falls through to search — a malformed scheme is not an address.
    }
    return search(trimmed);
  }

  if (looksLikeHost(trimmed)) return `${schemeFor(hostOf(trimmed).host)}://${trimmed}`;

  return search(trimmed);
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
