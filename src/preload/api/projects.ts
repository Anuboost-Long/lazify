import { ipcRenderer } from "electron";

import type {
	ImportedProjectIndexResult,
	ImportedProjectScanResult,
	ProjectAssetFile,
} from "../../renderer/shared/types/lazify";
export const projectsApi = {
	importProjectFromDirectory: (projectPath: string): Promise<ImportedProjectScanResult> =>
		ipcRenderer.invoke("lazify:import-project-from-directory", projectPath),
	importProjectIndexFromDirectory: (projectPath: string): Promise<ImportedProjectIndexResult> =>
		ipcRenderer.invoke("lazify:import-project-index-from-directory", projectPath),
	readImportedProjectFile: (filePath: string): Promise<string> =>
		ipcRenderer.invoke("lazify:read-imported-project-file", filePath),
	readProjectAssetFile: (filePath: string): Promise<ProjectAssetFile> =>
		ipcRenderer.invoke("lazify:read-project-asset-file", filePath),
};
