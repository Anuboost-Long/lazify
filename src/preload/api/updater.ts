import { ipcRenderer } from "electron";

import type { UpdateState } from "../../renderer/shared/types/lazify";
import { subscribe } from "./subscribe";
export const updaterApi = {
	getUpdateState: (): Promise<UpdateState> => ipcRenderer.invoke("lazify:update-state"),
	checkForUpdates: (): Promise<UpdateState> => ipcRenderer.invoke("lazify:check-for-updates"),
	downloadUpdate: (): Promise<UpdateState> => ipcRenderer.invoke("lazify:download-update"),
	quitAndInstallUpdate: (): Promise<void> => ipcRenderer.invoke("lazify:quit-and-install-update"),
	onUpdateStateChanged: (callback: (state: UpdateState) => void) =>
		subscribe("lazify:update-state-changed", callback),
};
