import { buildRouteId } from "../route-identity";
import { readAnnotationRoutes } from "../engine/annotation-routes";
import { readCallRoutes } from "../engine/call-routes";
import type { FrameworkRouteDraft } from "../engine/route-drafts";
import type { FrameworkRules } from "../rules/types";
import type {
  ApiRoute,
  ProjectInventory,
  RouteScanResult,
  RouteScanWarning,
  RouteScanner,
  ScannerEvidence,
  UnsupportedConstruct
} from "../types";
import { expandQueryParameters, indexModelProperties } from "./model-index";
import { readProjectServers } from "./project-servers";

function evidenceFor(project: ProjectInventory, framework: FrameworkRules): ScannerEvidence[] {
  const evidence: ScannerEvidence[] = [];

  if (framework.detect.stacks.includes(project.stack.stack)) {
    evidence.push({ kind: "stack", detail: `stack detected as ${project.stack.stack}` });
  }

  for (const dependency of framework.detect.dependencies) {
    if (project.hasDependency(dependency)) {
      evidence.push({ kind: "dependency", detail: `${dependency} dependency found` });
    }
  }

  const marker = framework.detect.files
    ? project.files.find((file) => framework.detect.files!.test(file))
    : undefined;

  if (marker) evidence.push({ kind: "file", detail: marker });

  return evidence;
}

function sourceFiles(project: ProjectInventory, framework: FrameworkRules) {
  const { extensions, priorityNames, skipDirectories } = framework.sources;
  const candidates = project.files.filter(
    (file) =>
      extensions.some((extension) => file.toLowerCase().endsWith(extension)) &&
      !skipDirectories?.test(file)
  );

  if (!priorityNames) return candidates;

  return [
    ...candidates.filter((file) => priorityNames.test(file)),
    ...candidates.filter((file) => !priorityNames.test(file))
  ];
}

function toApiRoute(
  projectPath: string,
  filePath: string,
  servers: string[],
  adapter: string,
  draft: FrameworkRouteDraft
): ApiRoute {
  return {
    id: buildRouteId(projectPath, draft.method, draft.path, filePath),
    projectPath,
    method: draft.method,
    path: draft.path,
    summary: draft.summary,
    description: null,
    operationId: null,
    tags: [],
    servers,
    source: {
      kind: "scanner",
      filePath,
      line: draft.line,
      adapter,
      confidence: draft.confidence
    },
    parameters: draft.parameters,
    headers: draft.headers,
    requestBody: draft.requestBody,
    responses: draft.responses,
    security: draft.security
  };
}

export function createFrameworkScanner(framework: FrameworkRules): RouteScanner {
  return {
    id: framework.id,
    label: framework.label,

    supports(project: ProjectInventory) {
      const evidence = evidenceFor(project, framework);
      const supported = evidence.length > 0 && sourceFiles(project, framework).length > 0;

      return { supported, confidence: supported ? 0.8 : 0, evidence };
    },

    async scan(project: ProjectInventory): Promise<RouteScanResult> {
      const startedAt = Date.now();
      const candidates = sourceFiles(project, framework);
      const inspected = candidates.slice(0, framework.sources.maxFiles);
      const servers = await readProjectServers(project);
      const routes: ApiRoute[] = [];
      const warnings: RouteScanWarning[] = [];
      const unsupported: UnsupportedConstruct[] = [];

      if (candidates.length > inspected.length) {
        warnings.push({
          scanner: framework.id,
          message: `Only the first ${framework.sources.maxFiles} source files were read; ${candidates.length - inspected.length} were skipped.`,
          filePath: null,
          line: null
        });
      }

      const sources: Array<{ filePath: string; lines: string[] }> = [];

      for (const filePath of inspected) {
        const content = await project.readFile(filePath).catch(() => null);
        if (content) sources.push({ filePath, lines: content.split(/\r?\n/) });
      }

      const models = indexModelProperties(sources.map((source) => source.lines));

      for (const { filePath, lines } of sources) {
        if (!lines.some((line) => framework.sources.marker.test(line))) continue;

        const fromAnnotations = readAnnotationRoutes(lines, framework);
        const fromCalls = readCallRoutes(lines, framework);

        routes.push(
          ...[...fromAnnotations.routes, ...fromCalls.routes].map((draft) =>
            toApiRoute(project.projectPath, filePath, servers, framework.id, draft)
          )
        );

        unsupported.push(
          ...[...fromAnnotations.unsupported, ...fromCalls.unsupported].map((entry) => ({
            scanner: framework.id,
            reason: entry.reason,
            filePath,
            line: entry.line
          }))
        );
      }

      return {
        projectPath: project.projectPath,
        routes: routes.map((route) => ({
          ...route,
          parameters: expandQueryParameters(models, framework, route.parameters)
        })),
        warnings,
        unsupported,
        filesInspected: inspected,
        scannersRun: [framework.id],
        durationMs: Date.now() - startedAt
      };
    }
  };
}
