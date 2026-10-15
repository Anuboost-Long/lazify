import { stableDigest } from "@/shared/lib/hash";
import path from "@/shared/lib/path";
import { restrictToOwner } from "@/platform/exec";
import { appDataPath, createFolder, deletePath, listFolderNames, readTextFile, writeTextFile } from "@/platform/folders";

import { bodyFileName, hasBody, readBody, writeBody } from "./response-bodies";
import { normalizedExamples, type SavedExample } from "./request-store";
import type { BodyMode, FormEntry } from "./runner/types";
import { EMPTY_SCRIPTS, type RouteScripts } from "./scripting/types";
import type { SavedRoute } from "./types";

const STORE_FILE = "api-studio-collections.json";
const BODY_DIRECTORY = "api-studio-collection-bodies";
const STORE_VERSION = 1;
const MAX_EXAMPLES = 10;

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

interface CollectionsStore {
	version: number;
	projects: Record<string, CustomCollection[]>;
}

async function storePath() {
	return path.join(await appDataPath(), STORE_FILE);
}

function projectKey(projectPath: string) {
	return path.resolve(projectPath);
}

async function bodyDirectory(projectPath: string) {
	const key = stableDigest(projectKey(projectPath)).slice(0, 12);

	return path.join(await appDataPath(), BODY_DIRECTORY, key);
}

export async function readCollectionBody(projectPath: string, bodyFile: string): Promise<string> {
	return readBody(await bodyDirectory(projectPath), bodyFile);
}

async function detached(request: CustomRequest, directory: string): Promise<SavedExample[]> {
	return Promise.all(
		request.examples.slice(-MAX_EXAMPLES).map(async (example) => {
			const fileName = example.bodyFile ?? bodyFileName(request.id, example.id);

			if (example.body || !(await hasBody(directory, fileName))) {
				await writeBody(directory, fileName, example.body);
			}

			return { ...example, body: "", bodyFile: fileName };
		}),
	);
}

async function pruneBodyDirectory(directory: string, keep: Set<string>) {
	const entries = await listFolderNames(directory);

	for (const entry of entries) {
		if (keep.has(entry)) continue;

		await deletePath(path.join(directory, entry));
	}
}

function draftFrom(draft: Partial<CustomRequestDraft> | null | undefined): CustomRequestDraft | null {
	if (!draft) return null;

	return {
		mode: draft.mode ?? "json",
		json: draft.json ?? "",
		entries: draft.entries ?? [],
		fields: draft.fields ?? {},
		scripts: {
			pre: draft.scripts?.pre ?? EMPTY_SCRIPTS.pre,
			post: draft.scripts?.post ?? EMPTY_SCRIPTS.post,
		},
		savedAt: draft.savedAt ?? new Date(0).toISOString(),
	};
}

function requestsFrom(requests: CustomRequest[] | undefined): CustomRequest[] {
	return (requests ?? [])
		.filter((request) => request?.id && request.route)
		.map((request) => ({
			id: request.id,
			name: request.name || request.route.path,
			routeId: request.routeId ?? null,
			route: request.route,
			draft: draftFrom(request.draft),
			examples: normalizedExamples(request.examples),
		}));
}

function normalized(collections: CustomCollection[] | undefined): CustomCollection[] {
	return (collections ?? [])
		.filter((collection) => collection?.id)
		.map((collection) => ({
			id: collection.id,
			name: collection.name || "",
			folders: (collection.folders ?? [])
				.filter((folder) => folder?.id)
				.map((folder) => ({
					id: folder.id,
					name: folder.name || "",
					requests: requestsFrom(folder.requests),
				})),
			requests: requestsFrom(collection.requests),
		}));
}

async function readStore(): Promise<CollectionsStore> {
	try {
		const content = await readTextFile(await storePath());
		const parsed = content ? (JSON.parse(content) as Partial<CollectionsStore>) : {};

		return {
			version: STORE_VERSION,
			projects: parsed?.version === STORE_VERSION ? (parsed.projects ?? {}) : {},
		};
	} catch {
		return { version: STORE_VERSION, projects: {} };
	}
}

async function writeStore(store: CollectionsStore) {
	const target = await storePath();

	await createFolder(path.dirname(target));
	await writeTextFile(target, `${JSON.stringify(store, null, 2)}\n`);
	await restrictToOwner(target);
}

export async function readCustomCollections(projectPath: string): Promise<CustomCollection[]> {
	return normalized((await readStore()).projects[projectKey(projectPath)]);
}

async function withDetachedBodies(projectPath: string, collections: CustomCollection[]) {
	const directory = await bodyDirectory(projectPath);
	const files = new Set<string>();
	const detachRequests = (requests: CustomRequest[]) =>
		Promise.all(
			requests.map(async (request) => {
				const examples = await detached(request, directory);

				for (const example of examples) {
					if (example.bodyFile) files.add(example.bodyFile);
				}

				return { ...request, examples };
			}),
		);

	const kept = await Promise.all(
		collections.map(async (collection) => ({
			...collection,
			requests: await detachRequests(collection.requests),
			folders: await Promise.all(
				collection.folders.map(async (folder) => ({
					...folder,
					requests: await detachRequests(folder.requests),
				})),
			),
		})),
	);

	await pruneBodyDirectory(directory, files);

	return kept;
}

export async function saveCustomCollections(
	projectPath: string,
	collections: CustomCollection[],
): Promise<CustomCollection[]> {
	const store = await readStore();
	const kept = await withDetachedBodies(projectPath, normalized(collections));

	if (kept.length === 0) delete store.projects[projectKey(projectPath)];
	else store.projects[projectKey(projectPath)] = kept;

	await writeStore(store);

	return kept;
}
