import { restrictToOwner } from "@/platform/exec";
import { appDataPath, createFolder, readTextFile, writeTextFile } from "@/platform/folders";
import path from "@/shared/lib/path";

import { sectionsFor } from "./sections";
import type {
	CollectionDoc,
	DocFolderEntry,
	DocRouteEntry,
	DocSectionScope,
	DocTheme,
} from "./types";

const STORE_FILE = "api-studio-docs.json";
const STORE_VERSION = 1;

const LOGO_URI = /^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/;

export const DEFAULT_THEME: DocTheme = {
	accent: "#2f6feb",
	logo: "",
	pageSize: "A4",
	margin: "normal",
	cover: true,
	contents: true,
	curl: true,
	examples: true,
	darkCode: false,
};

interface DocsStore {
	version: number;
	projects: Record<string, Record<string, CollectionDoc>>;
}

async function storePath() {
	return path.join(await appDataPath(), STORE_FILE);
}

function projectKey(projectPath: string) {
	return path.resolve(projectPath);
}

function knownSections(
	scope: DocSectionScope,
	sections: Record<string, string> | undefined,
): Record<string, string> {
	const kept: Record<string, string> = {};

	for (const spec of sectionsFor(scope)) {
		const text = sections?.[spec.id];

		if (typeof text === "string" && text.trim()) kept[spec.id] = text;
	}

	return kept;
}

function themeFrom(theme: Partial<DocTheme> | undefined): DocTheme {
	return {
		accent: theme?.accent || DEFAULT_THEME.accent,
		logo: typeof theme?.logo === "string" && LOGO_URI.test(theme.logo) ? theme.logo : "",
		pageSize: theme?.pageSize === "Letter" ? "Letter" : "A4",
		margin: theme?.margin === "narrow" || theme?.margin === "wide" ? theme.margin : "normal",
		cover: theme?.cover ?? DEFAULT_THEME.cover,
		contents: theme?.contents ?? DEFAULT_THEME.contents,
		curl: theme?.curl ?? DEFAULT_THEME.curl,
		examples: theme?.examples ?? DEFAULT_THEME.examples,
		darkCode: theme?.darkCode ?? DEFAULT_THEME.darkCode,
	};
}

function foldersFrom(folders: DocFolderEntry[] | undefined): DocFolderEntry[] {
	return (folders ?? [])
		.filter((folder) => folder?.id)
		.map((folder) => ({
			id: folder.id,
			name: folder.name || "",
			description: typeof folder.description === "string" ? folder.description : "",
		}));
}

function routesFrom(routes: DocRouteEntry[] | undefined): DocRouteEntry[] {
	return (routes ?? [])
		.filter((route) => route?.requestId)
		.map((route) => ({
			requestId: route.requestId,
			title: route.title || "",
			folderId: route.folderId || "",
			folder: route.folder || "",
			sections: knownSections("route", route.sections),
			writtenBy: route.writtenBy === "user" || route.writtenBy === "agent" ? route.writtenBy : "detected",
			updatedAt: route.updatedAt || new Date(0).toISOString(),
		}));
}

export function normalizedDoc(doc: Partial<CollectionDoc>, collectionId: string): CollectionDoc {
	return {
		collectionId,
		title: doc.title || "",
		subtitle: doc.subtitle || "",
		version: doc.version || "",
		baseUrl: doc.baseUrl || "",
		presetId: doc.presetId || "",
		sections: knownSections("collection", doc.sections),
		folders: foldersFrom(doc.folders),
		routes: routesFrom(doc.routes),
		theme: themeFrom(doc.theme),
		updatedAt: doc.updatedAt || new Date(0).toISOString(),
	};
}

async function readStore(): Promise<DocsStore> {
	try {
		const content = await readTextFile(await storePath());
		const parsed = content ? (JSON.parse(content) as Partial<DocsStore>) : {};

		return {
			version: STORE_VERSION,
			projects: parsed?.version === STORE_VERSION ? (parsed.projects ?? {}) : {},
		};
	} catch {
		return { version: STORE_VERSION, projects: {} };
	}
}

async function writeStore(store: DocsStore) {
	const target = await storePath();

	await createFolder(path.dirname(target));
	await writeTextFile(target, `${JSON.stringify(store, null, 2)}\n`);
	await restrictToOwner(target);
}

export async function readStoredDoc(projectPath: string, collectionId: string): Promise<CollectionDoc | null> {
	const held = (await readStore()).projects[projectKey(projectPath)]?.[collectionId];

	return held ? normalizedDoc(held, collectionId) : null;
}

export async function writeStoredDoc(projectPath: string, doc: CollectionDoc): Promise<CollectionDoc> {
	const store = await readStore();
	const key = projectKey(projectPath);
	const kept = normalizedDoc(doc, doc.collectionId);

	store.projects[key] = { ...store.projects[key], [doc.collectionId]: kept };
	await writeStore(store);

	return kept;
}

export async function pruneStoredDocs(projectPath: string, keptIds: string[]): Promise<void> {
	const store = await readStore();
	const key = projectKey(projectPath);
	const held = store.projects[key];

	if (!held) return;

	const keep = new Set(keptIds);
	const dropped = Object.keys(held).filter((collectionId) => !keep.has(collectionId));

	if (dropped.length === 0) return;

	for (const collectionId of dropped) delete held[collectionId];

	if (Object.keys(held).length === 0) delete store.projects[key];

	await writeStore(store);
}
