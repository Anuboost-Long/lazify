import type {
  ApiRoute,
  ProjectInventory,
  RouteScanResult,
  RouteScanWarning,
  RouteScanner,
  UnsupportedConstruct
} from "../../types";
import { locateOpenApiDocuments } from "./document-locator";
import { parseOpenApiDocument } from "./document-parser";
import { normalizeOpenApiDocument } from "./operation-normalizer";

const SCANNER_ID = "openapi";

export const openApiScanner: RouteScanner = {
  id: SCANNER_ID,
  label: "OpenAPI 3.x",

  async supports(project: ProjectInventory) {
    const documents = await locateOpenApiDocuments(project);

    return {
      supported: documents.length > 0,
      confidence: documents.length > 0 ? 1 : 0,
      evidence: documents.map((relativePath) => ({ kind: "file" as const, detail: relativePath }))
    };
  },

  async scan(project: ProjectInventory): Promise<RouteScanResult> {
    const startedAt = Date.now();
    const documentPaths = await locateOpenApiDocuments(project);
    const routes: ApiRoute[] = [];
    const warnings: RouteScanWarning[] = [];
    const unsupported: UnsupportedConstruct[] = [];

    for (const relativePath of documentPaths) {
      try {
        const document = await parseOpenApiDocument(project, relativePath);
        const normalized = normalizeOpenApiDocument(SCANNER_ID, project.projectPath, document);

        routes.push(...normalized.routes);
        warnings.push(...normalized.warnings);
        unsupported.push(...normalized.unsupported);
      } catch (error) {
        warnings.push({
          scanner: SCANNER_ID,
          message: error instanceof Error ? error.message : String(error),
          filePath: relativePath,
          line: null
        });
      }
    }

    return {
      projectPath: project.projectPath,
      routes,
      warnings,
      unsupported,
      filesInspected: documentPaths,
      scannersRun: [SCANNER_ID],
      durationMs: Date.now() - startedAt
    };
  }
};
