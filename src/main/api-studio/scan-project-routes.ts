import { createProjectInventory } from "./project-inventory";
import { routeIdentityKey } from "./route-identity";
import { routeScanners } from "./scanners";
import type {
  ApiRoute,
  ProjectInventory,
  RouteScanResult,
  RouteScanWarning,
  UnsupportedConstruct
} from "./types";

function dedupeRoutes(routes: ApiRoute[]): ApiRoute[] {
  const byIdentity = new Map<string, ApiRoute>();

  for (const route of routes) {
    const key = routeIdentityKey(route.method, route.path);
    if (!byIdentity.has(key)) byIdentity.set(key, route);
  }

  const order = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);

  return Array.from(byIdentity.values()).sort(
    (left, right) => order(left.path, right.path) || order(left.method, right.method)
  );
}

async function runScanners(project: ProjectInventory) {
  const routes: ApiRoute[] = [];
  const warnings: RouteScanWarning[] = [];
  const unsupported: UnsupportedConstruct[] = [];
  const filesInspected: string[] = [];
  const scannersRun: string[] = [];

  for (const scanner of routeScanners) {
    const support = await scanner.supports(project);
    if (!support.supported) continue;

    const result = await scanner.scan(project);

    routes.push(...result.routes);
    warnings.push(...result.warnings);
    unsupported.push(...result.unsupported);
    filesInspected.push(...result.filesInspected);
    scannersRun.push(scanner.id);
  }

  return { routes, warnings, unsupported, filesInspected, scannersRun };
}

export async function scanProjectRoutes(projectPath: string): Promise<RouteScanResult> {
  const startedAt = Date.now();
  const project = await createProjectInventory(projectPath);
  const collected = await runScanners(project);

  if (project.filesTruncated) {
    collected.warnings.push({
      scanner: "api-studio",
      message: "This project has more files than one scan reads, so some sources were skipped.",
      filePath: null,
      line: null
    });
  }

  if (collected.scannersRun.length === 0) {
    collected.warnings.push({
      scanner: "api-studio",
      message: "No API description or supported framework was found in this project.",
      filePath: null,
      line: null
    });
  }

  return {
    projectPath: project.projectPath,
    routes: dedupeRoutes(collected.routes),
    warnings: collected.warnings,
    unsupported: collected.unsupported,
    filesInspected: collected.filesInspected,
    scannersRun: collected.scannersRun,
    durationMs: Date.now() - startedAt
  };
}
