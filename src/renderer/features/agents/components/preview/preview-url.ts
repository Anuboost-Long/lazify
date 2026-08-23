const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

export function normalizePreviewUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `http://${/^\d{2,5}$/.test(trimmed) ? `localhost:${trimmed}` : trimmed}`;

  try {
    const url = new URL(withScheme);
    const host = url.hostname.toLowerCase();
    if (!LOOPBACK_HOSTS.has(host) && !host.endsWith(".localhost")) return null;
    return url.href;
  } catch {
    return null;
  }
}
