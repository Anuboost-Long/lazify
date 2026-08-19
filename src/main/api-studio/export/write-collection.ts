import fs from "node:fs/promises";
import path from "node:path";

import { deriveEnvironmentVariables, withCustomVariables } from "../environment";
import { readEnvironments } from "../environment-store";
import { readRequests } from "../request-store";
import { readRouteDetails, readRouteScan } from "../route-cache";
import { buildPostmanCollection } from "./postman-collection";
import type { SavedRoute } from "../types";

export interface CollectionExport {
  filePath: string;
  routes: number;
}

/** The detail files hold the parameters and bodies an export is mostly made of. */
async function withDetails(projectPath: string, routes: SavedRoute[]): Promise<SavedRoute[]> {
  const folders = Array.from(new Set(routes.map((route) => route.folder)));
  const details = new Map<string, SavedRoute>();

  for (const folder of folders) {
    for (const detail of await readRouteDetails(projectPath, folder)) {
      details.set(detail.id, detail as SavedRoute);
    }
  }

  return routes.map((route) => ({ ...route, ...details.get(route.id) }));
}

export async function exportPostmanCollection(
  projectPath: string,
  filePath: string
): Promise<CollectionExport | null> {
  const saved = await readRouteScan(projectPath);
  if (!saved) return null;

  const routes = await withDetails(projectPath, saved.routes);
  const environments = readEnvironments(projectPath);
  const active =
    environments.environments.find((one) => one.id === environments.activeId) ??
    environments.environments[0];

  const collection = buildPostmanCollection(
    path.basename(path.resolve(projectPath)),
    routes,
    withCustomVariables(deriveEnvironmentVariables(routes), environments.variables),
    active?.values ?? {},
    readRequests(projectPath).requests
  );

  await fs.writeFile(filePath, `${JSON.stringify(collection, null, 2)}\n`, "utf8");

  return { filePath, routes: routes.length };
}
