/** Session for the agent preview — loopback only, and isolated. */
export const PREVIEW_SESSION = "lazify-preview";

/** Session for the browser page — the open web, with logins that persist. */
export const BROWSER_SESSION = "lazify-web";

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
