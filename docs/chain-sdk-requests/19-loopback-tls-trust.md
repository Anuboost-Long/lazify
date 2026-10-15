# Capability Request 19 — Trust a self-signed certificate on a loopback request

Source: the Lazify rewrite to Chain, ticket 036 (API Studio request
execution), 2026-10-15.

**Not part of this request:**
- Trusting a bad certificate anywhere else. Only loopback addresses
  (`localhost`, `127.0.0.1`, `::1`, `0.0.0.0`, `*.localhost`) are ever
  eligible — a request to a real remote host always gets ordinary
  certificate validation.
- A user-facing toggle or per-host memory of "trust this cert." The
  decision is purely "is this URL's host loopback," computed the same
  way every time, same as Electron.
- Any change to `desktop.http`'s default behavior for every other
  caller (mneme included). This is additive — a request opts in.

## Why this needs a change in Chain

Lazify's API Studio sends requests to the API a project under
development is running — very often `https://localhost:5001` or
similar, with ASP.NET's and other frameworks' own dev-cert tooling
(`dotnet dev-certs https`), which mints a self-signed certificate
unless the developer has separately told their OS to trust it. A
plain HTTPS client refuses that certificate, which would make every
HTTPS dev server in API Studio fail by default — exactly the case
Electron's own code exists to handle
(`src/main/api-studio/runner/tls-trust.ts`, 24 lines):

```ts
import { Agent, buildConnector } from "undici";

const strictConnector = buildConnector({});
const loopbackConnector = buildConnector({ rejectUnauthorized: false });

export function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    host === "localhost" || host.endsWith(".localhost") ||
    host === "::1" || host === "0.0.0.0" ||
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)
  );
}

export const apiRequestDispatcher = new Agent({
  connect(options, callback) {
    const connector = isLoopbackHost(options.hostname ?? "") ? loopbackConnector : strictConnector;
    return connector(options, callback);
  },
});
```

`desktop.http`'s contract has no such option — every request gets
ordinary certificate validation, with no way to relax it for any host.
This was already flagged as a known gap in the rewrite's own capability
inventory (`01-capability-inventory.md`: "TLS exceptions and timing in
`http`"), ahead of any ticket needing it.

## What Lazify needs

- A way to tell `desktop.http.request()` (or its method shortcuts) that
  this one request may accept a self-signed or otherwise unverifiable
  certificate, e.g. a `rejectUnauthorized?: boolean` (default `true`) or
  `insecure?: boolean` option on the request config.
- Lazify decides *when* to set it (its own `isLoopbackHost`, computed
  from the request URL before it calls `desktop.http`) — Chain only
  needs to honor the flag for that one call.
- Everything else about the request (headers, body, timeout, redirects,
  `validateStatus`) stays exactly as the contract already describes.

Whether this is a new field on `request()`'s config, or a separate
escape hatch, is Chain's call — Lazify only needs *some* way to make
one request tolerate a bad certificate without touching every other
caller's default.

## How Lazify will use it

`src/shared/lib/api-studio/runner/send-request.ts` (ticket 036):
`isLoopbackHost(hostOf(draft.url))` decides whether to pass the new
option through to `desktop.http.request()`. Until this ships, API
Studio's HTTPS requests to a loopback dev server with a self-signed
certificate fail with an ordinary certificate error — a real,
documented regression from Electron for that one case, not a silent
gap; everything else about sending a request (method, headers, body,
timeout, following redirects, reading the response) works today
without this capability. Plain HTTP loopback traffic — by far the
common case for a local dev server — is unaffected either way.

## macOS / Windows

Not yet surveyed on either — this is a request made ahead of any
platform-specific testing, since the capability doesn't exist yet to
test. Node's own `rejectUnauthorized: false` (what Electron's
`tls-trust.ts` relies on via undici) works identically on both
platforms; whatever native TLS stack Chain's `http` capability uses
(likely `reqwest`/`rustls` or the OS's own TLS library) would need its
own equivalent checked on both.
