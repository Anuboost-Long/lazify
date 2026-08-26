import { ipcRenderer } from "electron";

import type { ExtensionState } from "../../main/extensions";
export const extensionsApi = {
	listExtensions: (refresh?: boolean): Promise<ExtensionState[]> =>
		ipcRenderer.invoke("lazify:list-extensions", refresh),
	installExtension: (id: string): Promise<ExtensionState[]> =>
		ipcRenderer.invoke("lazify:install-extension", id),
	removeExtension: (id: string): Promise<ExtensionState[]> =>
		ipcRenderer.invoke("lazify:remove-extension", id),
	toggleExtension: (id: string, enabled: boolean): Promise<ExtensionState[]> =>
		ipcRenderer.invoke("lazify:toggle-extension", id, enabled),
	writeExtensionManifest: (projectPath: string): Promise<string | null> =>
		ipcRenderer.invoke("lazify:write-extension-manifest", projectPath),
};
