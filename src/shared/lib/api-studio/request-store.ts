import { stableDigest } from "@/shared/lib/hash";
import path from "@/shared/lib/path";
import { ignoreLazifyDirectory } from "@/shared/lib/projects/lazify-directory";
import { restrictToOwner } from "@/platform/exec";
import { appDataPath, createFolder, deletePath, pathExists, readTextFile, writeTextFile } from "@/platform/folders";

import {
	bodyFileName,
	hasBody,
	moveBodies,
	pruneBodies,
	readBody,
	writeBody,
} from "./response-bodies";
import type { ApiRequestDraft, ApiResponseSummary, BodyMode, FormEntry } from "./runner/types";
import { EMPTY_SCRIPTS, type RouteScripts } from "./scripting/types";
import type { SavedRoute } from "./types";

const APP_STORE_FILE = "api-studio-requests.json";
const PROJECT_STORE_FILE = ".lazify/api-studio/requests.json";
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

async function appStorePath() {
	return path.join(await appDataPath(), APP_STORE_FILE);
}

function projectStorePath(projectPath: string) {
	return path.join(path.resolve(projectPath), PROJECT_STORE_FILE);
}

function projectKey(projectPath: string) {
	return stableDigest(path.resolve(projectPath)).slice(0, 12);
}

export async function bodyDirectory(projectPath: string, location: RequestStorage) {
	return location === "project"
		? path.join(path.resolve(projectPath), ".lazify", "api-studio", "responses")
		: path.join(await appDataPath(), "api-studio-responses", projectKey(projectPath));
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
	try {
		const content = await readTextFile(filePath);
		if (!content) return fallback;

		const parsed = JSON.parse(content) as T;

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

async function readAppStore(): Promise<AppStore> {
	const stored = await readJson<Partial<AppStore>>(await appStorePath(), {});

	return {
		version: STORE_VERSION,
		locations: stored.locations ?? {},
		projects: stored.projects ?? {},
	};
}

async function writeAppStore(store: AppStore) {
	const target = await appStorePath();

	await createFolder(path.dirname(target));
	await writeTextFile(target, `${JSON.stringify(store, null, 2)}\n`);
	await restrictToOwner(target);
}

async function writeProjectStore(projectPath: string, requests: ProjectRequests) {
	const filePath = projectStorePath(projectPath);
	const store: ProjectStore = { version: STORE_VERSION, requests };

	await createFolder(path.dirname(filePath));
	await ignoreLazifyDirectory(projectPath);
	await writeTextFile(filePath, `${JSON.stringify(store, null, 2)}\n`);
}

async function readProjectRequests(projectPath: string): Promise<ProjectRequests | null> {
	if (!(await pathExists(projectStorePath(projectPath)))) return null;

	const stored = await readJson<Partial<ProjectStore>>(projectStorePath(projectPath), {});

	return stored.version === STORE_VERSION ? normalized(stored.requests) : {};
}

/** The index carries what a response was; its body is written beside it. */
async function detached<T extends SavedResponse>(
	response: T,
	directory: string,
	routeId: string,
	kind: string,
): Promise<T> {
	const fileName = response.bodyFile ?? bodyFileName(routeId, kind);

	/**
	 * An empty body is not the same as no body. A caller holding the index
	 * without having read the files yet would otherwise write its emptiness over
	 * what is already there, and the response would be lost to its own save.
	 */
	if (response.body || !(await hasBody(directory, fileName))) {
		await writeBody(directory, fileName, response.body);
	}

	return { ...response, body: "", bodyFile: fileName };
}

/** A file in the project answers the question by itself, however this machine voted. */
export async function readRequests(projectPath: string): Promise<RequestStore> {
	const inProject = await readProjectRequests(projectPath);
	if (inProject) return { location: "project", requests: inProject };

	const store = await readAppStore();
	const resolvedProjectPath = path.resolve(projectPath);

	return {
		location: store.locations[resolvedProjectPath] ?? null,
		requests: normalized(store.projects[resolvedProjectPath]),
	};
}

/** One body, read when something is about to show it. */
export async function readResponseBody(projectPath: string, bodyFile: string): Promise<string> {
	const store = await readRequests(projectPath);

	return readBody(await bodyDirectory(projectPath, store.location ?? "app"), bodyFile);
}

async function write(projectPath: string, requests: ProjectRequests, location: RequestStorage) {
	const store = await readAppStore();
	const resolvedProjectPath = path.resolve(projectPath);

	if (location === "project") {
		await writeProjectStore(projectPath, requests);
		delete store.projects[resolvedProjectPath];
	} else {
		store.projects[resolvedProjectPath] = requests;
	}

	store.locations[resolvedProjectPath] = location;
	await writeAppStore(store);
}

export async function saveRequest(
	projectPath: string,
	routeId: string,
	request: SavedRequest,
): Promise<RequestStore> {
	const current = await readRequests(projectPath);
	const location = current.location ?? "app";
	const directory = await bodyDirectory(projectPath, location);
	const examples = await Promise.all(
		request.examples.slice(-MAX_EXAMPLES).map((example) => detached(example, directory, routeId, example.id)),
	);
	const response = request.response ? await detached(request.response, directory, routeId, "response") : null;

	await pruneBodies(
		directory,
		routeId,
		new Set(
			[response?.bodyFile, ...examples.map((example) => example.bodyFile)].filter(Boolean) as string[],
		),
	);

	const requests = { ...current.requests, [routeId]: { ...request, response, examples } };

	await write(projectPath, requests, location);

	return { location: current.location, requests };
}

export async function forgetRequest(projectPath: string, routeId: string): Promise<RequestStore> {
	const current = await readRequests(projectPath);
	const { [routeId]: dropped, ...requests } = current.requests;

	if (dropped) {
		await pruneBodies(await bodyDirectory(projectPath, current.location ?? "app"), routeId, new Set());
		await write(projectPath, requests, current.location ?? "app");
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
export async function collectExpiredResponses(projectPath: string, now = Date.now()): Promise<RequestStore> {
	const current = await readRequests(projectPath);
	const location = current.location ?? "app";
	const directory = await bodyDirectory(projectPath, location);
	let collected = false;

	const requests = Object.fromEntries(
		await Promise.all(
			Object.entries(current.requests).map(async ([routeId, request]) => {
				if (!request.response || !expired(request.response, now)) return [routeId, request] as const;

				collected = true;
				const kept = request.examples
					.map((example) => example.bodyFile)
					.filter((file): file is string => Boolean(file));

				await pruneBodies(directory, routeId, new Set(kept));

				return [routeId, { ...request, response: null }] as const;
			}),
		),
	);

	if (!collected) return current;

	await write(projectPath, requests, location);

	return { location: current.location, requests };
}

/** Every project this machine has kept anything for, swept on a timer. */
export async function collectEveryProject(now = Date.now()): Promise<void> {
	for (const projectPath of Object.keys((await readAppStore()).locations)) {
		try {
			await collectExpiredResponses(projectPath, now);
		} catch {
			/** A project that cannot be swept is not a reason to stop sweeping. */
		}
	}
}

/** Moving them is the point of choosing: what a user typed follows the choice. */
export async function setRequestStorage(projectPath: string, location: RequestStorage): Promise<RequestStore> {
	const current = await readRequests(projectPath);

	if (current.location !== location) {
		await moveBodies(
			await bodyDirectory(projectPath, current.location ?? "app"),
			await bodyDirectory(projectPath, location),
		);
	}

	if (current.location === "project" && location === "app") {
		await deletePath(projectStorePath(projectPath));
	}

	await write(projectPath, current.requests, location);

	return { location, requests: current.requests };
}
