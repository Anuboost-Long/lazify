import { desktop } from "@chain/sdk";

import { allowHost, forgetHost, readAllowedHosts as readHosts } from "@/shared/lib/api-studio/allowed-hosts";
import {
	readCollectionBody,
	readCustomCollections,
	saveCustomCollections,
	type CustomCollection,
} from "@/shared/lib/api-studio/custom-collections";
import { readEnvironments, saveEnvironments } from "@/shared/lib/api-studio/environment-store";
import { exportCustomCollection as exportCustom } from "@/shared/lib/api-studio/export/write-custom-collection";
import { exportPostmanCollection as exportPostman } from "@/shared/lib/api-studio/export/write-collection";
import { execFile } from "@/platform/exec";
import { readFileBytes, writeFileBytes } from "@/platform/folders";
import path from "@/shared/lib/path";
import {
	forgetRequest,
	readRequests,
	readResponseBody,
	saveRequest,
	setRequestStorage,
	type RequestStorage,
	type SavedRequest,
} from "@/shared/lib/api-studio/request-store";
import { readRouteDetails as readDetails, readRouteScan, saveRouteScan } from "@/shared/lib/api-studio/route-cache";
import { runApiRequest as runRequest } from "@/shared/lib/api-studio/runner/run-request";
import { sendApiRequest as sendRequest } from "@/shared/lib/api-studio/runner/send-request";
import type { ApiRequestDraft } from "@/shared/lib/api-studio/runner/types";
import { scanProjectRoutes as scanRoutes } from "@/shared/lib/api-studio/scan-project-routes";
import {
	readScriptSettings as readSettings,
	saveScriptSettings as saveSettings,
	type ScriptSettings,
} from "@/shared/lib/api-studio/script-settings";
import type { ScriptedRunInput } from "@/shared/lib/api-studio/scripting/types";
import type { ApiEnvironmentSet } from "@/shared/lib/api-studio/types";

export async function scanProjectRoutes(projectPath: string) {
	return saveRouteScan(await scanRoutes(projectPath));
}

export function readProjectRoutes(projectPath: string) {
	return readRouteScan(projectPath);
}

export function readRouteDetails(projectPath: string, folder: string) {
	return readDetails(projectPath, folder);
}

export function readApiEnvironments(projectPath: string) {
	return readEnvironments(projectPath);
}

export function saveApiEnvironments(projectPath: string, set: ApiEnvironmentSet, secretNames: string[]) {
	return saveEnvironments(projectPath, set, secretNames);
}

export function sendApiRequest(draft: ApiRequestDraft) {
	return sendRequest(draft);
}

export function readAllowedHosts(projectPath: string) {
	return readHosts(projectPath);
}

export function allowApiHost(projectPath: string, url: string) {
	return allowHost(projectPath, url);
}

export function forgetApiHost(projectPath: string, host: string) {
	return forgetHost(projectPath, host);
}

export function runApiRequest(input: ScriptedRunInput) {
	return runRequest(input);
}

export function readScriptSettings(projectPath: string) {
	return readSettings(projectPath);
}

export function saveScriptSettings(projectPath: string, settings: ScriptSettings) {
	return saveSettings(projectPath, settings);
}

export function readApiRequests(projectPath: string) {
	return readRequests(projectPath);
}

export function saveApiRequest(projectPath: string, routeId: string, request: SavedRequest) {
	return saveRequest(projectPath, routeId, request);
}

export function forgetApiRequest(projectPath: string, routeId: string) {
	return forgetRequest(projectPath, routeId);
}

export function readApiResponseBody(projectPath: string, bodyFile: string) {
	return readResponseBody(projectPath, bodyFile);
}

export function setApiRequestStorage(projectPath: string, location: RequestStorage) {
	return setRequestStorage(projectPath, location);
}

export function readApiCollections(projectPath: string) {
	return readCustomCollections(projectPath);
}

export function saveApiCollections(projectPath: string, collections: CustomCollection[]) {
	return saveCustomCollections(projectPath, collections);
}

export function readApiCollectionBody(projectPath: string, bodyFile: string) {
	return readCollectionBody(projectPath, bodyFile);
}

/**
 * No save dialog exists to ask for a new filename in a chosen folder — same
 * limitation `saveResponseFile` and ticket 033's DMG destination picker hit.
 * This picks a destination folder and keeps the suggested filename.
 */
async function exportPathFor(suggestedName: string): Promise<string | null> {
	const [grant] = await desktop.folders.pick({ files: false });

	return grant ? path.join(grant.path, suggestedName) : null;
}

export async function exportPostmanCollection(projectPath: string) {
	const filePath = await exportPathFor(`${path.basename(path.resolve(projectPath))}.postman_collection.json`);

	return filePath ? exportPostman(projectPath, filePath) : null;
}

export async function exportCustomCollection(projectPath: string, collectionId: string, collectionName: string) {
	const filePath = await exportPathFor(`${collectionName || "collection"}.postman_collection.json`);

	return filePath ? exportCustom(projectPath, collectionId, filePath) : null;
}

export async function saveResponseFile(filePath: string, suggestedName: string): Promise<string | null> {
	const destination = await exportPathFor(suggestedName);
	if (!destination) return null;

	await writeFileBytes(destination, await readFileBytes(filePath));

	return destination;
}

export async function openResponseFile(filePath: string): Promise<string | null> {
	try {
		await execFile("open", [filePath]);

		return null;
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
}
