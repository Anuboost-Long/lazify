import { desktop } from "@chain/sdk";

import {
	collectionDocBrief as docBrief,
	collectionDocQuestions as docQuestions,
	exportCollectionDoc as exportDoc,
	importCollectionDocDraft as importDraft,
	readCollectionDoc as readDoc,
	renderCollectionDoc,
	saveCollectionDoc as saveDoc,
	writeCollectionDocBrief as writeBrief,
	writeDocPreviewFile,
} from "@/shared/lib/api-studio/docs";
import type { CollectionDoc, DocFormat } from "@/shared/lib/api-studio/docs/types";
import {
	onCollectionDocDraftChanged as onChanged,
	unwatchCollectionDocDraft as unwatch,
	watchCollectionDocDraft as watch,
} from "@/shared/lib/api-studio/docs/watch-registry";
import { execFile } from "@/platform/exec";
import { exportPathFor } from "@/platform/api-studio";

const LOGO_TYPES: Record<string, string> = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	webp: "image/webp",
};
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const FORMAT_EXTENSION: Record<DocFormat, string> = { pdf: "pdf", html: "html" };

function base64(bytes: Uint8Array): string {
	let binary = "";

	for (let index = 0; index < bytes.length; index += 0x8000) {
		binary += String.fromCodePoint(...bytes.subarray(index, index + 0x8000));
	}

	return btoa(binary);
}

export function readCollectionDoc(projectPath: string, collectionId: string) {
	return readDoc(projectPath, collectionId);
}

export function saveCollectionDoc(projectPath: string, doc: CollectionDoc) {
	return saveDoc(projectPath, doc);
}

export function previewCollectionDoc(projectPath: string, collectionId: string) {
	return renderCollectionDoc(projectPath, collectionId);
}

export async function openCollectionDoc(projectPath: string, collectionId: string): Promise<string | null> {
	const filePath = await writeDocPreviewFile(projectPath, collectionId);
	if (!filePath) return null;

	try {
		await execFile("open", [filePath]);

		return null;
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
}

export async function exportCollectionDoc(
	projectPath: string,
	collectionId: string,
	format: DocFormat,
	name: string,
) {
	const filePath = await exportPathFor(`${name || "api"}.${FORMAT_EXTENSION[format] ?? "html"}`);

	return filePath ? exportDoc(projectPath, collectionId, format, filePath) : null;
}

export async function chooseDocLogo(): Promise<string | null> {
	const [chosen] = await desktop.files.pick({ extensions: Object.keys(LOGO_TYPES) });
	if (!chosen) return null;

	const extension = chosen.name.slice(chosen.name.lastIndexOf(".") + 1).toLowerCase();
	const mediaType = LOGO_TYPES[extension];

	if (!mediaType || chosen.bytes.byteLength > MAX_LOGO_BYTES) return null;

	return `data:${mediaType};base64,${base64(chosen.bytes)}`;
}

export function collectionDocBrief(projectPath: string, collectionId: string) {
	return docBrief(projectPath, collectionId);
}

export function collectionDocQuestions(projectPath: string, collectionId: string, keys: string[]) {
	return docQuestions(projectPath, collectionId, keys);
}

export function writeCollectionDocBrief(projectPath: string, collectionId: string) {
	return writeBrief(projectPath, collectionId);
}

export async function importCollectionDocDraft(
	projectPath: string,
	collectionId: string,
	choose: boolean,
	onlyEmpty = false,
) {
	if (!choose) return importDraft(projectPath, collectionId, undefined, onlyEmpty);

	// No extension filter on this picker either — same gap ticket 033 already decided isn't worth a request on its own.
	const [grant] = await desktop.folders.pick({ files: true });

	return grant ? importDraft(projectPath, collectionId, grant.path, onlyEmpty) : null;
}

export function watchCollectionDocDraft(projectPath: string, collectionId: string) {
	return watch(projectPath, collectionId);
}

export function unwatchCollectionDocDraft(collectionId: string) {
	return unwatch(collectionId);
}

export function onCollectionDocDraftChanged(callback: (collectionId: string) => void) {
	return onChanged(callback);
}
