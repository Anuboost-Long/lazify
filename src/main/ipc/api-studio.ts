import fs from "node:fs/promises";
import path from "node:path";

import { dialog, ipcMain, shell } from "electron";

import { scanProjectRoutes } from "../api-studio";
import { allowHost, forgetHost, readAllowedHosts } from "../api-studio/allowed-hosts";
import {
	readCollectionBody,
	readCustomCollections,
	saveCustomCollections,
} from "../api-studio/custom-collections";
import type { CustomCollection } from "../api-studio/custom-collections";
import { pruneCollectionDocs } from "../api-studio/docs";
import { readEnvironments, saveEnvironments } from "../api-studio/environment-store";
import { exportCustomCollection, exportPostmanCollection } from "../api-studio/export";
import {
	collectEveryProject,
	collectExpiredResponses,
	forgetRequest,
	readResponseBody,
	saveRequest,
	setRequestStorage,
} from "../api-studio/request-store";
import type { RequestStorage, SavedRequest } from "../api-studio/request-store";
import { readRouteDetails, readRouteScan, saveRouteScan } from "../api-studio/route-cache";
import { runApiRequest, sendApiRequest } from "../api-studio/runner";
import type { ApiRequestDraft } from "../api-studio/runner";
import { readScriptSettings, saveScriptSettings } from "../api-studio/script-settings";
import type { ScriptSettings } from "../api-studio/script-settings";
import type { ScriptedRunInput } from "../api-studio/scripting";
import { logWarn } from "../diagnostics/logger";
import type { IpcContext } from "./context";

const COLLECTION_INTERVAL_MS = 60_000;

export function registerApiStudioHandlers(ctx?: IpcContext) {
	/** A session left open collects its own litter, and never at the app's expense. */
	setInterval(() => {
		try {
			collectEveryProject();
		} catch (error) {
			logWarn("api-studio", "could not collect expired responses", error);
		}
	}, COLLECTION_INTERVAL_MS).unref();

	ipcMain.handle("lazify:scan-project-routes", async (_event, projectPath: string) =>
		saveRouteScan(await scanProjectRoutes(projectPath)),
	);

	ipcMain.handle("lazify:read-project-routes", async (_event, projectPath: string) =>
		readRouteScan(projectPath),
	);

	ipcMain.handle("lazify:read-route-details", async (_event, projectPath: string, folder: string) =>
		readRouteDetails(projectPath, folder),
	);

	ipcMain.handle("lazify:read-api-environments", async (_event, projectPath: string) =>
		readEnvironments(projectPath),
	);

	ipcMain.handle(
		"lazify:save-api-environments",
		async (
			_event,
			projectPath: string,
			set: import("../api-studio/types").ApiEnvironmentSet,
			secretNames: string[],
		) => saveEnvironments(projectPath, set, secretNames),
	);

	// A file to attach to a multipart body: the renderer keeps the path, not the bytes.
	ipcMain.handle("lazify:choose-upload-file", async () => {
		const options = { title: "Which file should be attached?", properties: ["openFile" as const] };
		const result = ctx?.mainWindow
			? await dialog.showOpenDialog(ctx.mainWindow, options)
			: await dialog.showOpenDialog(options);

		return result.canceled ? null : (result.filePaths[0] ?? null);
	});

	// "Export collection": a Postman v2.1 file, wherever the user puts it.
	ipcMain.handle("lazify:export-postman-collection", async (_event, projectPath: string) => {
		const suggested = `${path.basename(path.resolve(projectPath))}.postman_collection.json`;
		const options = {
			title: "Where should the collection go?",
			defaultPath: suggested,
			filters: [{ name: "Postman Collection", extensions: ["json"] }],
		};

		const result = ctx?.mainWindow
			? await dialog.showSaveDialog(ctx.mainWindow, options)
			: await dialog.showSaveDialog(options);

		if (result.canceled || !result.filePath) return null;

		return exportPostmanCollection(projectPath, result.filePath);
	});

	ipcMain.handle(
		"lazify:export-custom-collection",
		async (_event, projectPath: string, collectionId: string, collectionName: string) => {
			const options = {
				title: "Where should the collection go?",
				defaultPath: `${collectionName || "collection"}.postman_collection.json`,
				filters: [{ name: "Postman Collection", extensions: ["json"] }],
			};

			const result = ctx?.mainWindow
				? await dialog.showSaveDialog(ctx.mainWindow, options)
				: await dialog.showSaveDialog(options);

			if (result.canceled || !result.filePath) return null;

			return exportCustomCollection(projectPath, collectionId, result.filePath);
		},
	);

	ipcMain.handle(
		"lazify:save-response-file",
		async (_event, filePath: string, suggestedName: string) => {
			const options = { title: "Where should the file go?", defaultPath: suggestedName };
			const result = ctx?.mainWindow
				? await dialog.showSaveDialog(ctx.mainWindow, options)
				: await dialog.showSaveDialog(options);

			if (result.canceled || !result.filePath) return null;

			await fs.copyFile(filePath, result.filePath);

			return result.filePath;
		},
	);

	ipcMain.handle("lazify:open-response-file", async (_event, filePath: string) => {
		const failure = await shell.openPath(filePath);

		return failure.length > 0 ? failure : null;
	});

	ipcMain.handle("lazify:send-api-request", async (_event, draft: ApiRequestDraft) =>
		sendApiRequest(draft),
	);

	ipcMain.handle("lazify:run-api-request", async (_event, input: ScriptedRunInput) =>
		runApiRequest(input),
	);

	ipcMain.handle("lazify:read-allowed-hosts", async (_event, projectPath: string) =>
		readAllowedHosts(projectPath),
	);

	ipcMain.handle("lazify:allow-api-host", async (_event, projectPath: string, url: string) =>
		allowHost(projectPath, url),
	);

	ipcMain.handle("lazify:forget-api-host", async (_event, projectPath: string, host: string) =>
		forgetHost(projectPath, host),
	);

	ipcMain.handle("lazify:read-script-settings", async (_event, projectPath: string) =>
		readScriptSettings(projectPath),
	);

	ipcMain.handle(
		"lazify:save-script-settings",
		async (_event, projectPath: string, settings: ScriptSettings) =>
			saveScriptSettings(projectPath, settings),
	);

	/** Reading is also when the expired are swept, so nothing stale is ever served. */
	ipcMain.handle("lazify:read-api-requests", async (_event, projectPath: string) =>
		collectExpiredResponses(projectPath),
	);

	ipcMain.handle(
		"lazify:save-api-request",
		async (_event, projectPath: string, routeId: string, request: SavedRequest) =>
			saveRequest(projectPath, routeId, request),
	);

	ipcMain.handle("lazify:forget-api-request", async (_event, projectPath: string, routeId: string) =>
		forgetRequest(projectPath, routeId),
	);

	ipcMain.handle(
		"lazify:read-api-response-body",
		async (_event, projectPath: string, bodyFile: string) => readResponseBody(projectPath, bodyFile),
	);

	ipcMain.handle("lazify:read-api-collections", async (_event, projectPath: string) =>
		readCustomCollections(projectPath),
	);

	ipcMain.handle(
		"lazify:save-api-collections",
		async (_event, projectPath: string, collections: CustomCollection[]) => {
			const kept = saveCustomCollections(projectPath, collections);

			pruneCollectionDocs(projectPath, kept);

			return kept;
		},
	);

	ipcMain.handle(
		"lazify:read-api-collection-body",
		async (_event, projectPath: string, bodyFile: string) =>
			readCollectionBody(projectPath, bodyFile),
	);

	ipcMain.handle(
		"lazify:set-api-request-storage",
		async (_event, projectPath: string, location: RequestStorage) =>
			setRequestStorage(projectPath, location),
	);
}
