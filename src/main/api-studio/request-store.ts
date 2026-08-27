import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { app } from "electron";

import { ensureLazifyDirectory } from "../projects/lazify-directory";
import {
	bodyFileName,
	hasBody,
	moveBodies,
	pruneBodies,
	readBody,
	writeBody,
} from "./response-bodies";
import type { ApiRequestDraft, ApiResponseSummary, BodyMode, FormEntry } from "./runner";
import { EMPTY_SCRIPTS, type RouteScripts } from "./scripting/types";
import type { SavedRoute } from "./types";

const APP_STORE_FILE = "api-studio-requests.json";
const PROJECT_STORE_FILE = path.join(".lazify", "api-studio", "requests.json");
const STORE_VERSION = 1;
const MAX_EXAMPLES = 10;
/** What nobody chose to keep is scaffolding: it goes five minutes after it lands. */
const RESPONSE_TTL_MS = 5 * 60 * 1000;

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

export function normalizedExamples(examples: SavedExample[] | undefined): SavedExample[] {
	return (examples ?? [])
		.filter((example) => example?.id)
		.map((example) => ({ ...example, request: example.request ?? null }));
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

interface AppStore {
	version: number;
	locations: Record<string, RequestStorage>;
	projects: Record<string, ProjectRequests>;
}

interface ProjectStore {
	version: number;
	requests: ProjectRequests;
}

function appStorePath() {
	return path.join(app.getPath("userData"), APP_STORE_FILE);
}

function projectStorePath(projectPath: string) {
	return path.join(path.resolve(projectPath), PROJECT_STORE_FILE);
}

function projectKey(projectPath: string) {
	return createHash("sha1").update(path.resolve(projectPath)).digest("hex").slice(0, 12);
}

export function bodyDirectory(projectPath: string, location: RequestStorage) {
	return location === "project"
		? path.join(path.resolve(projectPath), ".lazify", "api-studio", "responses")
		: path.join(app.getPath("userData"), "api-studio-responses", projectKey(projectPath));
}

function readJson<T>(filePath: string, fallback: T): T {
	try {
		const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as T;

		return parsed && typeof parsed === "object" ? parsed : fallback;
	} catch {
		return fallback;
	}
}

/**
 * What is on disk was written by whichever version wrote it. Every read passes
 * through here, so the rest of this file can trust the shape it is given.
 */
function normalized(requests: ProjectRequests | undefined): ProjectRequests {
	return Object.fromEntries(
		Object.entries(requests ?? {}).map(([routeId, request]) => [
			routeId,
			{
				mode: request?.mode ?? "json",
				json: request?.json ?? "",
				entries: request?.entries ?? [],
				fields: request?.fields ?? {},
				scripts: {
					pre: request?.scripts?.pre ?? EMPTY_SCRIPTS.pre,
					post: request?.scripts?.post ?? EMPTY_SCRIPTS.post,
				},
				response: request?.response ?? null,
				examples: normalizedExamples(request?.examples),
				savedAt: request?.savedAt ?? new Date(0).toISOString(),
			},
		]),
	);
}

function readAppStore(): AppStore {
	const stored = readJson<Partial<AppStore>>(appStorePath(), {});

	return {
		version: STORE_VERSION,
		locations: stored.locations ?? {},
		projects: stored.projects ?? {},
	};
}

function writeAppStore(store: AppStore) {
	fs.mkdirSync(path.dirname(appStorePath()), { recursive: true });
	fs.writeFileSync(appStorePath(), `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
}

function writeProjectStore(projectPath: string, requests: ProjectRequests) {
	const filePath = projectStorePath(projectPath);
	const store: ProjectStore = { version: STORE_VERSION, requests };

	ensureLazifyDirectory(projectPath, path.dirname(filePath));
	fs.writeFileSync(filePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function readProjectRequests(projectPath: string): ProjectRequests | null {
	if (!fs.existsSync(projectStorePath(projectPath))) return null;

	const stored = readJson<Partial<ProjectStore>>(projectStorePath(projectPath), {});

	return stored.version === STORE_VERSION ? normalized(stored.requests) : {};
}

/** The index carries what a response was; its body is written beside it. */
function detached<T extends SavedResponse>(
	response: T,
	directory: string,
	routeId: string,
	kind: string,
): T {
	const fileName = response.bodyFile ?? bodyFileName(routeId, kind);

	/**
	 * An empty body is not the same as no body. A caller holding the index
	 * without having read the files yet would otherwise write its emptiness over
	 * what is already there, and the response would be lost to its own save.
	 */
	if (response.body || !hasBody(directory, fileName)) {
		writeBody(directory, fileName, response.body);
	}

	return { ...response, body: "", bodyFile: fileName };
}

/** A file in the project answers the question by itself, however this machine voted. */
export function readRequests(projectPath: string): RequestStore {
	const inProject = readProjectRequests(projectPath);
	if (inProject) return { location: "project", requests: inProject };

	const store = readAppStore();
	const resolvedProjectPath = path.resolve(projectPath);

	return {
		location: store.locations[resolvedProjectPath] ?? null,
		requests: normalized(store.projects[resolvedProjectPath]),
	};
}

/** One body, read when something is about to show it. */
export function readResponseBody(projectPath: string, bodyFile: string): string {
	const store = readRequests(projectPath);

	return readBody(bodyDirectory(projectPath, store.location ?? "app"), bodyFile);
}

function write(projectPath: string, requests: ProjectRequests, location: RequestStorage) {
	const store = readAppStore();
	const resolvedProjectPath = path.resolve(projectPath);

	if (location === "project") {
		writeProjectStore(projectPath, requests);
		delete store.projects[resolvedProjectPath];
	} else {
		store.projects[resolvedProjectPath] = requests;
	}

	store.locations[resolvedProjectPath] = location;
	writeAppStore(store);
}

export function saveRequest(
	projectPath: string,
	routeId: string,
	request: SavedRequest,
): RequestStore {
	const current = readRequests(projectPath);
	const location = current.location ?? "app";
	const directory = bodyDirectory(projectPath, location);
	const examples = request.examples
		.slice(-MAX_EXAMPLES)
		.map((example) => detached(example, directory, routeId, example.id));
	const response = request.response
		? detached(request.response, directory, routeId, "response")
		: null;

	pruneBodies(
		directory,
		routeId,
		new Set(
			[response?.bodyFile, ...examples.map((example) => example.bodyFile)].filter(Boolean) as string[],
		),
	);

	const requests = { ...current.requests, [routeId]: { ...request, response, examples } };

	write(projectPath, requests, location);

	return { location: current.location, requests };
}

export function forgetRequest(projectPath: string, routeId: string): RequestStore {
	const current = readRequests(projectPath);
	const { [routeId]: dropped, ...requests } = current.requests;

	if (dropped) {
		pruneBodies(bodyDirectory(projectPath, current.location ?? "app"), routeId, new Set());
		write(projectPath, requests, current.location ?? "app");
	}

	return { location: current.location, requests };
}

function expired(response: SavedResponse, now: number) {
	const at = Date.parse(response.receivedAt);

	return Number.isFinite(at) && now - at > RESPONSE_TTL_MS;
}

/**
 * The response a route happens to have returned is kept so a rescan or a walk
 * to another route does not lose it, not so it lives forever. A response the
 * user saved is an example and is never collected.
 */
export function collectExpiredResponses(projectPath: string, now = Date.now()): RequestStore {
	const current = readRequests(projectPath);
	const location = current.location ?? "app";
	const directory = bodyDirectory(projectPath, location);
	let collected = false;

	const requests = Object.fromEntries(
		Object.entries(current.requests).map(([routeId, request]) => {
			if (!request.response || !expired(request.response, now)) return [routeId, request];

			collected = true;
			const kept = request.examples
				.map((example) => example.bodyFile)
				.filter((file): file is string => Boolean(file));

			pruneBodies(directory, routeId, new Set(kept));

			return [routeId, { ...request, response: null }];
		}),
	);

	if (!collected) return current;

	write(projectPath, requests, location);

	return { location: current.location, requests };
}

/** Every project this machine has kept anything for, swept on a timer. */
export function collectEveryProject(now = Date.now()): void {
	for (const projectPath of Object.keys(readAppStore().locations)) {
		try {
			collectExpiredResponses(projectPath, now);
		} catch {
			/** A project that cannot be swept is not a reason to stop sweeping. */
		}
	}
}

/** Moving them is the point of choosing: what a user typed follows the choice. */
export function setRequestStorage(projectPath: string, location: RequestStorage): RequestStore {
	const current = readRequests(projectPath);

	if (current.location !== location) {
		moveBodies(
			bodyDirectory(projectPath, current.location ?? "app"),
			bodyDirectory(projectPath, location),
		);
	}

	if (current.location === "project" && location === "app") {
		fs.rmSync(projectStorePath(projectPath), { force: true });
	}

	write(projectPath, current.requests, location);

	return { location, requests: current.requests };
}
