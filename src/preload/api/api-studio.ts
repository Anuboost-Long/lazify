import { ipcRenderer } from "electron";
export const apiStudioApi = {
	scanProjectRoutes: (
		projectPath: string,
	): Promise<import("../../main/api-studio/types").SavedRouteScan> =>
		ipcRenderer.invoke("lazify:scan-project-routes", projectPath),
	readProjectRoutes: (
		projectPath: string,
	): Promise<import("../../main/api-studio/types").SavedRouteScan | null> =>
		ipcRenderer.invoke("lazify:read-project-routes", projectPath),
	readRouteDetails: (
		projectPath: string,
		folder: string,
	): Promise<import("../../main/api-studio/types").SavedRouteDetail[]> =>
		ipcRenderer.invoke("lazify:read-route-details", projectPath, folder),
	readApiEnvironments: (
		projectPath: string,
	): Promise<import("../../main/api-studio/types").ApiEnvironmentSet> =>
		ipcRenderer.invoke("lazify:read-api-environments", projectPath),
	saveApiEnvironments: (
		projectPath: string,
		set: import("../../main/api-studio/types").ApiEnvironmentSet,
		secretNames: string[],
	): Promise<import("../../main/api-studio/types").ApiEnvironmentSet> =>
		ipcRenderer.invoke("lazify:save-api-environments", projectPath, set, secretNames),
	exportPostmanCollection: (
		projectPath: string,
	): Promise<import("../../main/api-studio/export").CollectionExport | null> =>
		ipcRenderer.invoke("lazify:export-postman-collection", projectPath),
	readApiRequests: (
		projectPath: string,
	): Promise<import("../../main/api-studio/request-store").RequestStore> =>
		ipcRenderer.invoke("lazify:read-api-requests", projectPath),
	saveApiRequest: (
		projectPath: string,
		routeId: string,
		request: import("../../main/api-studio/request-store").SavedRequest,
	): Promise<import("../../main/api-studio/request-store").RequestStore> =>
		ipcRenderer.invoke("lazify:save-api-request", projectPath, routeId, request),
	forgetApiRequest: (
		projectPath: string,
		routeId: string,
	): Promise<import("../../main/api-studio/request-store").RequestStore> =>
		ipcRenderer.invoke("lazify:forget-api-request", projectPath, routeId),
	readApiResponseBody: (projectPath: string, bodyFile: string): Promise<string> =>
		ipcRenderer.invoke("lazify:read-api-response-body", projectPath, bodyFile),
	readApiCollections: (
		projectPath: string,
	): Promise<import("../../main/api-studio/custom-collections").CustomCollection[]> =>
		ipcRenderer.invoke("lazify:read-api-collections", projectPath),
	exportCustomCollection: (
		projectPath: string,
		collectionId: string,
		collectionName: string,
	): Promise<import("../../main/api-studio/export").CollectionExport | null> =>
		ipcRenderer.invoke("lazify:export-custom-collection", projectPath, collectionId, collectionName),
	saveResponseFile: (filePath: string, suggestedName: string): Promise<string | null> =>
		ipcRenderer.invoke("lazify:save-response-file", filePath, suggestedName),
	openResponseFile: (filePath: string): Promise<string | null> =>
		ipcRenderer.invoke("lazify:open-response-file", filePath),
	readApiCollectionBody: (projectPath: string, bodyFile: string): Promise<string> =>
		ipcRenderer.invoke("lazify:read-api-collection-body", projectPath, bodyFile),
	saveApiCollections: (
		projectPath: string,
		collections: import("../../main/api-studio/custom-collections").CustomCollection[],
	): Promise<import("../../main/api-studio/custom-collections").CustomCollection[]> =>
		ipcRenderer.invoke("lazify:save-api-collections", projectPath, collections),
	setApiRequestStorage: (
		projectPath: string,
		location: import("../../main/api-studio/request-store").RequestStorage,
	): Promise<import("../../main/api-studio/request-store").RequestStore> =>
		ipcRenderer.invoke("lazify:set-api-request-storage", projectPath, location),
	sendApiRequest: (
		draft: import("../../main/api-studio/runner").ApiRequestDraft,
	): Promise<import("../../main/api-studio/runner").ApiSendOutcome> =>
		ipcRenderer.invoke("lazify:send-api-request", draft),
	runApiRequest: (
		input: import("../../main/api-studio/scripting").ScriptedRunInput,
	): Promise<import("../../main/api-studio/scripting").ApiRunOutcome> =>
		ipcRenderer.invoke("lazify:run-api-request", input),
	readAllowedHosts: (projectPath: string): Promise<string[]> =>
		ipcRenderer.invoke("lazify:read-allowed-hosts", projectPath),
	allowApiHost: (projectPath: string, url: string): Promise<string[]> =>
		ipcRenderer.invoke("lazify:allow-api-host", projectPath, url),
	forgetApiHost: (projectPath: string, host: string): Promise<string[]> =>
		ipcRenderer.invoke("lazify:forget-api-host", projectPath, host),
	readScriptSettings: (
		projectPath: string,
	): Promise<import("../../main/api-studio/script-settings").ScriptSettings> =>
		ipcRenderer.invoke("lazify:read-script-settings", projectPath),
	saveScriptSettings: (
		projectPath: string,
		settings: import("../../main/api-studio/script-settings").ScriptSettings,
	): Promise<import("../../main/api-studio/script-settings").ScriptSettings> =>
		ipcRenderer.invoke("lazify:save-script-settings", projectPath, settings),
};
