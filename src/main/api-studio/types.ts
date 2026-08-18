import type { PackageJsonContent } from "../../brain/stack-detection/package-json-reader";
import type { StackDetectionResult } from "../../brain/stack-detection/types";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";

export type RouteSourceKind = "openapi" | "scanner" | "manual";

export type RouteConfidence = "exact" | "inferred" | "ambiguous";

export type ParameterLocation = "path" | "query" | "cookie";

export interface ApiParameter {
  name: string;
  location: ParameterLocation;
  required: boolean;
  description: string | null;
  schemaType: string | null;
  example: string | null;
}

export interface ApiHeader {
  name: string;
  value: string | null;
  required: boolean;
  description: string | null;
}

export interface ApiBodyVariant {
  mediaType: string;
  schemaType: string | null;
  example: string | null;
}

export interface ApiBody {
  required: boolean;
  description: string | null;
  variants: ApiBodyVariant[];
}

export interface ApiResponseDefinition {
  status: string;
  description: string | null;
  mediaTypes: string[];
}

export type SecuritySchemeKind = "bearer" | "basic" | "apiKey" | "oauth2" | "openIdConnect";

export interface RouteSecurity {
  kind: SecuritySchemeKind;
  schemeName: string;
  location: "header" | "query" | "cookie";
  parameterName: string;
}

export interface ApiRouteSource {
  kind: RouteSourceKind;
  filePath: string | null;
  line: number | null;
  adapter: string;
  confidence: RouteConfidence;
}

export interface ApiRoute {
  id: string;
  projectPath: string;
  method: HttpMethod;
  path: string;
  summary: string | null;
  description: string | null;
  operationId: string | null;
  tags: string[];
  servers: string[];
  source: ApiRouteSource;
  parameters: ApiParameter[];
  headers: ApiHeader[];
  requestBody: ApiBody | null;
  responses: ApiResponseDefinition[];
  security: RouteSecurity[];
}

export interface ApiVariable {
  name: string;
  secret: boolean;
  location: "url" | "header" | "query" | "cookie";
  parameterName: string | null;
  defaultValue: string | null;
  routeCount: number;
}

export interface ApiEnvironment {
  id: string;
  name: string;
  values: Record<string, string>;
}

export interface ApiEnvironmentSet {
  activeId: string;
  environments: ApiEnvironment[];
}

export interface ScannerEvidence {
  kind: "dependency" | "file" | "stack";
  detail: string;
}

export interface ScannerSupport {
  supported: boolean;
  confidence: number;
  evidence: ScannerEvidence[];
}

export interface RouteScanWarning {
  scanner: string;
  message: string;
  filePath: string | null;
  line: number | null;
}

export interface UnsupportedConstruct {
  scanner: string;
  reason: string;
  filePath: string | null;
  line: number | null;
}

export interface RouteScanResult {
  projectPath: string;
  routes: ApiRoute[];
  warnings: RouteScanWarning[];
  unsupported: UnsupportedConstruct[];
  filesInspected: string[];
  scannersRun: string[];
  durationMs: number;
}

/** What the collection lists and searches, and what the environment derives from. */
export interface SavedRouteSummary {
  id: string;
  folder: string;
  method: HttpMethod;
  path: string;
  summary: string | null;
  operationId: string | null;
  tags: string[];
  servers: string[];
  headers: ApiHeader[];
  security: RouteSecurity[];
  source: ApiRouteSource;
  firstSeenAt: string;
}

/** The bulk of a route, kept per folder and read when one is opened. */
export interface SavedRouteDetail {
  id: string;
  description: string | null;
  parameters: ApiParameter[];
  requestBody: ApiBody | null;
  responses: ApiResponseDefinition[];
}

export type SavedRoute = SavedRouteSummary & Partial<SavedRouteDetail>;

/** One route as it sits in the index: shared values live at the top level. */
export interface StoredRoute {
  id: string;
  folder: string;
  method: HttpMethod;
  path: string;
  summary?: string;
  operationId?: string;
  tags?: string[];
  file?: string;
  line?: number;
  adapter: string;
  confidence: RouteConfidence;
  sourceKind: RouteSourceKind;
  security?: string[];
  headers?: ApiHeader[];
  servers?: string[];
  firstSeenAt: string;
}

export interface StoredRouteIndex {
  version: number;
  projectPath: string;
  createdAt: string;
  scannedAt: string;
  durationMs: number;
  filesInspected: number;
  scannersRun: string[];
  servers: string[];
  securitySchemes: Record<string, Omit<RouteSecurity, "schemeName">>;
  routes: StoredRoute[];
  warnings: RouteScanWarning[];
  unsupported: UnsupportedConstruct[];
}

export interface SavedRouteScan {
  version: number;
  projectPath: string;
  createdAt: string;
  scannedAt: string;
  durationMs: number;
  filesInspected: number;
  scannersRun: string[];
  routes: SavedRouteSummary[];
  warnings: RouteScanWarning[];
  unsupported: UnsupportedConstruct[];
}

export interface ProjectInventory {
  projectPath: string;
  stack: StackDetectionResult;
  packageJson: PackageJsonContent | null;
  files: string[];
  filesTruncated: boolean;
  hasDependency: (name: string) => boolean;
  readFile: (relativePath: string) => Promise<string>;
}

export interface RouteScanner {
  id: string;
  label: string;
  supports: (project: ProjectInventory) => Promise<ScannerSupport> | ScannerSupport;
  scan: (project: ProjectInventory) => Promise<RouteScanResult>;
}
