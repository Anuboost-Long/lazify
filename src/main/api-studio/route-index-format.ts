import type { RouteSecurity, SavedRouteSummary, StoredRoute, StoredRouteIndex } from "./types";

type SchemeTable = StoredRouteIndex["securitySchemes"];

/** Field names this format owns. Anything else on a route is a user's, and is kept. */
const STORED_KEYS = new Set([
  "id",
  "folder",
  "method",
  "path",
  "summary",
  "operationId",
  "tags",
  "file",
  "line",
  "adapter",
  "confidence",
  "sourceKind",
  "security",
  "headers",
  "servers",
  "firstSeenAt"
]);

const SUMMARY_KEYS = new Set([
  "id",
  "folder",
  "method",
  "path",
  "summary",
  "operationId",
  "tags",
  "servers",
  "headers",
  "security",
  "source",
  "firstSeenAt"
]);

function extrasOf(entry: Record<string, unknown>, owned: Set<string>) {
  return Object.fromEntries(Object.entries(entry).filter(([key]) => !owned.has(key)));
}

function omitEmpty(entry: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(entry).filter(
      ([, value]) =>
        value !== null && value !== undefined && (!Array.isArray(value) || value.length > 0)
    )
  );
}

export function collectSecuritySchemes(routes: SavedRouteSummary[]): SchemeTable {
  const schemes: SchemeTable = {};

  for (const route of routes) {
    for (const security of route.security) {
      schemes[security.schemeName] = {
        kind: security.kind,
        location: security.location,
        parameterName: security.parameterName
      };
    }
  }

  return schemes;
}

/** The servers nearly every route shares, hoisted so they are stated once. */
export function collectServers(routes: SavedRouteSummary[]): string[] {
  const counts = new Map<string, number>();

  for (const route of routes) {
    const key = route.servers.join(" ");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const [common] = Array.from(counts.entries()).sort((left, right) => right[1] - left[1]);

  return common?.[0] ? common[0].split(" ").filter((server) => server.length > 0) : [];
}

export function toStoredRoute(route: SavedRouteSummary, servers: string[]): StoredRoute {
  const sharesServers = route.servers.join(" ") === servers.join(" ");

  return {
    ...extrasOf(route as unknown as Record<string, unknown>, SUMMARY_KEYS),
    ...omitEmpty({
      id: route.id,
      folder: route.folder,
      method: route.method,
      path: route.path,
      summary: route.summary ?? undefined,
      operationId: route.operationId ?? undefined,
      tags: route.tags,
      file: route.source.filePath ?? undefined,
      line: route.source.line ?? undefined,
      adapter: route.source.adapter,
      confidence: route.source.confidence,
      sourceKind: route.source.kind,
      security: route.security.map((security) => security.schemeName),
      headers: route.headers,
      servers: sharesServers ? undefined : route.servers,
      firstSeenAt: route.firstSeenAt
    })
  } as unknown as StoredRoute;
}

export function fromStoredRoute(
  stored: StoredRoute,
  servers: string[],
  schemes: SchemeTable
): SavedRouteSummary {
  const security = (stored.security ?? [])
    .map((schemeName) => {
      const scheme = schemes[schemeName];

      return scheme ? { ...scheme, schemeName } : null;
    })
    .filter((entry): entry is RouteSecurity => entry !== null);

  return {
    ...extrasOf(stored as unknown as Record<string, unknown>, STORED_KEYS),
    id: stored.id,
    folder: stored.folder,
    method: stored.method,
    path: stored.path,
    summary: stored.summary ?? null,
    operationId: stored.operationId ?? null,
    tags: stored.tags ?? [],
    servers: stored.servers ?? servers,
    headers: stored.headers ?? [],
    security,
    source: {
      kind: stored.sourceKind,
      filePath: stored.file ?? null,
      line: stored.line ?? null,
      adapter: stored.adapter,
      confidence: stored.confidence
    },
    firstSeenAt: stored.firstSeenAt
  };
}
