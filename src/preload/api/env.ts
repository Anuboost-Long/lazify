import { ipcRenderer } from "electron";

import type {
	EnvFileSummary,
	EnvVariablePatch,
	ProjectEnvFile,
} from "../../renderer/shared/types/lazify";
export const envApi = {
	listEnvFiles: (projectPath: string): Promise<EnvFileSummary[]> =>
		ipcRenderer.invoke("lazify:list-env-files", projectPath),
	readEnvFile: (projectPath: string, fileName: string): Promise<ProjectEnvFile> =>
		ipcRenderer.invoke("lazify:read-env-file", projectPath, fileName),
	updateEnvVariable: (
		projectPath: string,
		fileName: string,
		line: number,
		expectedKey: string,
		patch: EnvVariablePatch,
	): Promise<ProjectEnvFile> =>
		ipcRenderer.invoke("lazify:update-env-variable", projectPath, fileName, line, expectedKey, patch),
	deleteEnvVariable: (
		projectPath: string,
		fileName: string,
		line: number,
		expectedKey: string,
	): Promise<ProjectEnvFile> =>
		ipcRenderer.invoke("lazify:delete-env-variable", projectPath, fileName, line, expectedKey),
	addEnvVariable: (
		projectPath: string,
		fileName: string,
		key: string,
		value: string,
	): Promise<ProjectEnvFile> =>
		ipcRenderer.invoke("lazify:add-env-variable", projectPath, fileName, key, value),
	createEnvFile: (projectPath: string, fileName: string): Promise<ProjectEnvFile> =>
		ipcRenderer.invoke("lazify:create-env-file", projectPath, fileName),
};
