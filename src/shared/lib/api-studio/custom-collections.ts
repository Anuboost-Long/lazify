import type { SavedExample } from "./request-store";
import type { BodyMode, FormEntry } from "@/shared/lib/api-studio/runner/types";
import type { RouteScripts } from "./scripting/types";
import type { SavedRoute } from "./types";

export interface CustomRequestDraft {
  mode: BodyMode;
  json: string;
  entries: FormEntry[];
  fields: Record<string, string>;
  scripts: RouteScripts;
  savedAt: string;
}

export interface CustomRequest {
  id: string;
  name: string;
  routeId: string | null;
  route: SavedRoute;
  draft: CustomRequestDraft | null;
  examples: SavedExample[];
}

export interface CustomFolder {
  id: string;
  name: string;
  requests: CustomRequest[];
}

export interface CustomCollection {
  id: string;
  name: string;
  folders: CustomFolder[];
  requests: CustomRequest[];
}

export interface CollectionsStore {
  version: number;
  projects: Record<string, CustomCollection[]>;
}
