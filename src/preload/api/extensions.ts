import { ipcRenderer } from "electron";

import type { ExtensionState, InstallJob } from "../../main/extensions";
import { subscribe } from "./subscribe";
export const extensionsApi = {
	listExtensions: (refresh?: boolean): Promise<ExtensionState[]> =>
		ipcRenderer.invoke("lazify:list-extensions", refresh),
	installExtension: (id: string): Promise<InstallJob> =>
		ipcRenderer.invoke("lazify:install-extension", id),
	extensionInstallJobs: (): Promise<InstallJob[]> =>
		ipcRenderer.invoke("lazify:extension-install-jobs"),
	removeExtension: (id: string): Promise<ExtensionState[]> =>
		ipcRenderer.invoke("lazify:remove-extension", id),
	toggleExtension: (id: string, enabled: boolean): Promise<ExtensionState[]> =>
		ipcRenderer.invoke("lazify:toggle-extension", id, enabled),
	writeExtensionManifest: (projectPath: string): Promise<string | null> =>
		ipcRenderer.invoke("lazify:write-extension-manifest", projectPath),
	onExtensionInstall: (callback: (job: InstallJob) => void) =>
		subscribe("lazify:extension-install", callback),
};
