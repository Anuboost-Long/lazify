import { ipcRenderer } from "electron";

import { subscribe } from "./subscribe";
export const apiDocsApi = {
	readCollectionDoc: (
		projectPath: string,
		collectionId: string,
	): Promise<import("../../main/api-studio/docs").DocState | null> =>
		ipcRenderer.invoke("lazify:read-collection-doc", projectPath, collectionId),
	saveCollectionDoc: (
		projectPath: string,
		doc: import("../../main/api-studio/docs").CollectionDoc,
	): Promise<import("../../main/api-studio/docs").DocState | null> =>
		ipcRenderer.invoke("lazify:save-collection-doc", projectPath, doc),
	previewCollectionDoc: (projectPath: string, collectionId: string): Promise<string | null> =>
		ipcRenderer.invoke("lazify:preview-collection-doc", projectPath, collectionId),
	openCollectionDoc: (projectPath: string, collectionId: string): Promise<string | null> =>
		ipcRenderer.invoke("lazify:open-collection-doc", projectPath, collectionId),
	exportCollectionDoc: (
		projectPath: string,
		collectionId: string,
		format: import("../../main/api-studio/docs").DocFormat,
		name: string,
	): Promise<import("../../main/api-studio/docs").DocExport | null> =>
		ipcRenderer.invoke("lazify:export-collection-doc", projectPath, collectionId, format, name),
	chooseDocLogo: (): Promise<string | null> => ipcRenderer.invoke("lazify:choose-doc-logo"),
	collectionDocBrief: (
		projectPath: string,
		collectionId: string,
	): Promise<import("../../main/api-studio/docs").DocBrief | null> =>
		ipcRenderer.invoke("lazify:collection-doc-brief", projectPath, collectionId),
	collectionDocQuestions: (
		projectPath: string,
		collectionId: string,
		keys: string[],
	): Promise<string | null> =>
		ipcRenderer.invoke("lazify:collection-doc-questions", projectPath, collectionId, keys),
	writeCollectionDocBrief: (
		projectPath: string,
		collectionId: string,
	): Promise<import("../../main/api-studio/docs").DocBriefFiles | null> =>
		ipcRenderer.invoke("lazify:write-collection-doc-brief", projectPath, collectionId),
	importCollectionDocDraft: (
		projectPath: string,
		collectionId: string,
		choose: boolean,
		onlyEmpty?: boolean,
	): Promise<import("../../main/api-studio/docs").DocImportResult | null> =>
		ipcRenderer.invoke(
			"lazify:import-collection-doc-draft",
			projectPath,
			collectionId,
			choose,
			onlyEmpty,
		),
	watchCollectionDocDraft: (projectPath: string, collectionId: string): Promise<boolean> =>
		ipcRenderer.invoke("lazify:watch-collection-doc-draft", projectPath, collectionId),
	unwatchCollectionDocDraft: (collectionId: string): Promise<void> =>
		ipcRenderer.invoke("lazify:unwatch-collection-doc-draft", collectionId),
	onCollectionDocDraftChanged: (callback: (collectionId: string) => void) =>
		subscribe("lazify:collection-doc-draft-changed", callback),
};
