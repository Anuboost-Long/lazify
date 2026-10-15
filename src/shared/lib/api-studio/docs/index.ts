import { appTempPath, writeTextFile } from "@/platform/folders";
import path from "@/shared/lib/path";

import { readCollectionBody, readCustomCollections } from "../custom-collections";
import type { CustomCollection, CustomRequest } from "../custom-collections";
import { buildDocBrief, briefFiles, mergeAgentDraft, readAgentDraft, writeDocBrief } from "./brief";
import { pruneStoredDocs, readStoredDoc, writeStoredDoc } from "./doc-store";
import { docGaps, heldRequests, syncedDoc } from "./outline";
import { docQuestionPrompt } from "./questions";
import { buildDocumentHtml, type DocRouteInput } from "./render/document";
import { writeDocPdf } from "./render/pdf";
import type {
	CollectionDoc,
	DocBrief,
	DocBriefFiles,
	DocExport,
	DocFormat,
	DocImportResult,
	DocState,
} from "./types";

async function collectionOf(projectPath: string, collectionId: string): Promise<CustomCollection | null> {
	return (
		(await readCustomCollections(projectPath)).find((collection) => collection.id === collectionId) ?? null
	);
}

function stateOf(collection: CustomCollection, doc: CollectionDoc): DocState {
	return { doc, gaps: docGaps(collection, doc) };
}

export async function readCollectionDoc(projectPath: string, collectionId: string): Promise<DocState | null> {
	const collection = await collectionOf(projectPath, collectionId);

	if (!collection) return null;

	return stateOf(collection, syncedDoc(collection, await readStoredDoc(projectPath, collectionId)));
}

export async function saveCollectionDoc(projectPath: string, doc: CollectionDoc): Promise<DocState | null> {
	const collection = await collectionOf(projectPath, doc.collectionId);

	if (!collection) return null;

	const kept = await writeStoredDoc(projectPath, { ...doc, updatedAt: new Date().toISOString() });

	return stateOf(collection, syncedDoc(collection, kept));
}

async function withExampleBodies(projectPath: string, request: CustomRequest): Promise<CustomRequest> {
	return {
		...request,
		examples: await Promise.all(
			request.examples.map(async (example) => {
				if (example.body || !example.bodyFile) return example;

				try {
					return { ...example, body: await readCollectionBody(projectPath, example.bodyFile) };
				} catch {
					return example;
				}
			}),
		),
	};
}

async function routeInputs(
	projectPath: string,
	collection: CustomCollection,
	doc: CollectionDoc,
): Promise<DocRouteInput[]> {
	const entries = new Map(doc.routes.map((route) => [route.requestId, route]));

	const inputs = await Promise.all(
		heldRequests(collection).map(async ({ request, folder }) => {
			const entry = entries.get(request.id);

			if (!entry) return null;

			return { entry: { ...entry, folder }, request: await withExampleBodies(projectPath, request) };
		}),
	);

	return inputs.filter((input): input is DocRouteInput => input !== null);
}

export async function renderCollectionDoc(projectPath: string, collectionId: string): Promise<string | null> {
	const collection = await collectionOf(projectPath, collectionId);
	const state = await readCollectionDoc(projectPath, collectionId);

	if (!collection || !state) return null;

	return buildDocumentHtml({
		doc: state.doc,
		routes: await routeInputs(projectPath, collection, state.doc),
		generatedAt: new Date().toISOString().slice(0, 10),
	});
}

export async function writeDocPreviewFile(projectPath: string, collectionId: string): Promise<string | null> {
	const html = await renderCollectionDoc(projectPath, collectionId);

	if (!html) return null;

	const filePath = path.join(await appTempPath(), `lazify-api-doc-${collectionId}.html`);

	await writeTextFile(filePath, html);

	return filePath;
}

export async function exportCollectionDoc(
	projectPath: string,
	collectionId: string,
	format: DocFormat,
	filePath: string,
): Promise<DocExport | null> {
	const state = await readCollectionDoc(projectPath, collectionId);
	const html = await renderCollectionDoc(projectPath, collectionId);

	if (!state || !html) return null;

	if (format === "pdf") await writeDocPdf(html, state.doc.theme, state.doc.title, filePath);
	else await writeTextFile(filePath, html);

	return { filePath, format, routes: state.doc.routes.length };
}

export async function collectionDocQuestions(
	projectPath: string,
	collectionId: string,
	keys: string[],
): Promise<string | null> {
	const state = await readCollectionDoc(projectPath, collectionId);

	return state ? docQuestionPrompt(projectPath, collectionId, state.doc, state.gaps, keys) : null;
}

export async function collectionDocBrief(projectPath: string, collectionId: string): Promise<DocBrief | null> {
	const collection = await collectionOf(projectPath, collectionId);
	const state = await readCollectionDoc(projectPath, collectionId);

	return collection && state ? buildDocBrief(projectPath, collection, state.doc) : null;
}

export async function writeCollectionDocBrief(
	projectPath: string,
	collectionId: string,
): Promise<DocBriefFiles | null> {
	const collection = await collectionOf(projectPath, collectionId);
	const state = await readCollectionDoc(projectPath, collectionId);

	return collection && state ? writeDocBrief(projectPath, collection, state.doc) : null;
}

export async function importCollectionDocDraft(
	projectPath: string,
	collectionId: string,
	filePath?: string,
	onlyEmpty = false,
): Promise<DocImportResult | null> {
	const collection = await collectionOf(projectPath, collectionId);
	const state = await readCollectionDoc(projectPath, collectionId);

	if (!collection || !state) return null;

	const source = filePath || briefFiles(projectPath, collection).answerPath;
	const draft = await readAgentDraft(source).catch(() => null);

	if (!draft) return null;

	const merged = mergeAgentDraft(state.doc, draft, onlyEmpty);

	// Polled as well as watched: a pass that changes nothing must not churn the store.
	if (merged.filled === 0) return { ...merged, doc: state.doc };

	const kept = await writeStoredDoc(projectPath, merged.doc);

	return { ...merged, doc: syncedDoc(collection, kept) };
}

export { DOC_PRESETS, DEFAULT_DOC_PRESET_ID, docPreset } from "./presets";
export { COLLECTION_SECTIONS, ROUTE_SECTIONS, sectionsFor, sectionSpec, sectionTitle } from "./sections";
export { DEFAULT_THEME } from "./doc-store";

export async function pruneCollectionDocs(projectPath: string, collections: CustomCollection[]): Promise<void> {
	await pruneStoredDocs(
		projectPath,
		collections.map((collection) => collection.id),
	);
}
export { briefFiles } from "./brief";
export { docGaps, heldRequests, syncedDoc } from "./outline";
export { gapKey } from "./gap-key";
export type * from "./types";
