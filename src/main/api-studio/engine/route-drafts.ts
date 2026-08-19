import type {
  ApiBody,
  ApiHeader,
  ApiParameter,
  ApiResponseDefinition,
  HttpMethod,
  RouteConfidence,
  RouteSecurity
} from "../types";

export interface FrameworkRouteDraft {
  method: HttpMethod;
  path: string;
  summary: string | null;
  line: number;
  parameters: ApiParameter[];
  headers: ApiHeader[];
  requestBody: ApiBody | null;
  responses: ApiResponseDefinition[];
  security: RouteSecurity[];
  /** Declared exempt from whatever the project requires of everything else. */
  anonymous: boolean;
  confidence: RouteConfidence;
}

export interface FrameworkFileScan {
  routes: FrameworkRouteDraft[];
  unsupported: Array<{ reason: string; line: number }>;
}
