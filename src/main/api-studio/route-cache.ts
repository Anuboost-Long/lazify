import fs from "node:fs/promises";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";

import {
  collectSecuritySchemes,
  collectServers,
  fromStoredRoute,
  toStoredRoute
} from "./route-index-format";
import type {
  ApiRoute,
  RouteScanResult,
  SavedRouteDetail,
  SavedRouteScan,
  SavedRouteSummary,
  StoredRouteIndex
} from "./types";

const CACHE_DIRECTORY = path.join(".lazify", "api-studio");
const INDEX_FILE_NAME = "routes.json";
const DETAIL_DIRECTORY = "routes";
const SUPERSEDED_FILE = path.join(".lazify", "api-studio-routes.json");
const SAVED_SCAN_VERSION = 3;

export function routeIndexPath(projectPath: string) {
  return path.join(path.resolve(projectPath), CACHE_DIRECTORY, INDEX_FILE_NAME);
}

export function routeDetailPath(projectPath: string, folder: string) {
  return path.join(
    path.resolve(projectPath),
    CACHE_DIRECTORY,
    DETAIL_DIRECTORY,
    `${folder}.json.gz`
  );
}

export function folderOf(routePath: string) {
  const [firstSegment] = routePath.split("/").filter(Boolean);

  return (firstSegment ?? "root").replace(/[^\w.-]/g, "_");
}

function toSummary(route: ApiRoute, firstSeenAt: string): SavedRouteSummary {
  return {
    id: route.id,
    folder: folderOf(route.path),
    method: route.method,
    path: route.path,
    summary: route.summary,
    operationId: route.operationId,
    tags: route.tags,
    servers: route.servers,
    headers: route.headers,
    security: route.security,
    source: route.source,
    firstSeenAt
  };
}

function toDetail(route: ApiRoute): SavedRouteDetail {
  return {
    id: route.id,
    description: route.description,
    parameters: route.parameters,
    requestBody: route.requestBody,
    responses: route.responses
  };
}

async function writeAtomically(filePath: string, content: string | Buffer) {
  const temporaryPath = `${filePath}.writing`;

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(temporaryPath, content);
  await fs.rename(temporaryPath, filePath);
}

async function writeDetails(projectPath: string, routes: ApiRoute[]) {
  const byFolder = new Map<string, SavedRouteDetail[]>();

  for (const route of routes) {
    const folder = folderOf(route.path);
    byFolder.set(folder, [...(byFolder.get(folder) ?? []), toDetail(route)]);
  }

  const directory = path.join(path.resolve(projectPath), CACHE_DIRECTORY, DETAIL_DIRECTORY);
  const written = new Set<string>();

  for (const [folder, details] of byFolder) {
    await writeAtomically(
      routeDetailPath(projectPath, folder),
      gzipSync(Buffer.from(JSON.stringify(details), "utf8"))
    );
    written.add(`${folder}.json.gz`);
  }

  for (const entry of await fs.readdir(directory).catch(() => [])) {
    if (!written.has(entry)) await fs.rm(path.join(directory, entry), { force: true });
  }
}

export async function saveRouteScan(result: RouteScanResult): Promise<SavedRouteScan> {
  const previous = await readRouteScan(result.projectPath);
  const savedBefore = new Map(previous?.routes.map((route) => [route.id, route]) ?? []);
  const scannedAt = new Date().toISOString();

  const saved: SavedRouteScan = {
    version: SAVED_SCAN_VERSION,
    projectPath: result.projectPath,
    createdAt: previous?.createdAt ?? scannedAt,
    scannedAt,
    durationMs: result.durationMs,
    filesInspected: result.filesInspected.length,
    scannersRun: result.scannersRun,
    routes: result.routes.map((route) => {
      const before = savedBefore.get(route.id);

      return { ...before, ...toSummary(route, before?.firstSeenAt ?? scannedAt) };
    }),
    warnings: result.warnings,
    unsupported: result.unsupported
  };

  const servers = collectServers(saved.routes);
  const stored: StoredRouteIndex = {
    version: saved.version,
    projectPath: saved.projectPath,
    createdAt: saved.createdAt,
    scannedAt: saved.scannedAt,
    durationMs: saved.durationMs,
    filesInspected: saved.filesInspected,
    scannersRun: saved.scannersRun,
    servers,
    securitySchemes: collectSecuritySchemes(saved.routes),
    routes: saved.routes.map((route) => toStoredRoute(route, servers)),
    warnings: saved.warnings,
    unsupported: saved.unsupported
  };

  await writeDetails(result.projectPath, result.routes);
  await writeAtomically(routeIndexPath(result.projectPath), `${JSON.stringify(stored, null, 2)}\n`);
  await fs.rm(path.join(path.resolve(result.projectPath), SUPERSEDED_FILE), { force: true });

  return saved;
}

export async function readRouteScan(projectPath: string): Promise<SavedRouteScan | null> {
  const resolvedProjectPath = path.resolve(projectPath);
  const content = await fs.readFile(routeIndexPath(resolvedProjectPath), "utf8").catch(() => null);

  if (!content) return null;

  try {
    const stored = JSON.parse(content) as StoredRouteIndex;

    if (stored.version !== SAVED_SCAN_VERSION) return null;
    if (stored.projectPath !== resolvedProjectPath) return null;
    if (!Array.isArray(stored.routes)) return null;

    return {
      ...stored,
      routes: stored.routes.map((route) =>
        fromStoredRoute(route, stored.servers ?? [], stored.securitySchemes ?? {})
      )
    };
  } catch {
    return null;
  }
}

/** Read on demand: a collection lists from the index and opens one folder at a time. */
export async function readRouteDetails(
  projectPath: string,
  folder: string
): Promise<SavedRouteDetail[]> {
  const packed = await fs.readFile(routeDetailPath(projectPath, folder)).catch(() => null);

  if (!packed) return [];

  try {
    return JSON.parse(gunzipSync(packed).toString("utf8")) as SavedRouteDetail[];
  } catch {
    return [];
  }
}
