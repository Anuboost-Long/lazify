import type { ApiRequestDraft, ApiResponseSummary, BodyMode, FormEntry } from "@/shared/lib/api-studio/runner/types";
import type { RouteScripts } from "./scripting/types";
import type { SavedRoute } from "./types";

export type RequestStorage = "app" | "project";

export interface SavedResponse extends ApiResponseSummary {
	receivedAt: string;
	/** The file the body lives in. Empty until one has been written. */
	bodyFile?: string;
}

export interface ExampleRequest extends ApiRequestDraft {
	route: SavedRoute;
	baseUrl: string;
	fields: Record<string, string>;
	mode: BodyMode;
	json: string;
	entries: FormEntry[];
	scripts: RouteScripts;
}

/** A response a user chose to keep, with the request that produced it. */
export interface SavedExample extends SavedResponse {
	id: string;
	name: string;
	request: ExampleRequest | null;
}

export interface SavedRequest {
	mode: BodyMode;
	json: string;
	entries: FormEntry[];
	fields: Record<string, string>;
	scripts: RouteScripts;
	response: SavedResponse | null;
	examples: SavedExample[];
	savedAt: string;
}

export type ProjectRequests = Record<string, SavedRequest>;

export interface RequestStore {
	/** Null until the user has said where these belong. */
	location: RequestStorage | null;
	requests: ProjectRequests;
}

export interface AppStore {
	version: number;
	locations: Record<string, RequestStorage>;
	projects: Record<string, ProjectRequests>;
}

export interface ProjectStore {
	version: number;
	requests: ProjectRequests;
}
