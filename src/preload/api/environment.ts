import { ipcRenderer } from "electron";

import type {
	NvmActionResult,
	NvmInstallResult,
	NvmVersionList,
	ToolScanReport,
	ToolUpdateInfo,
} from "../../main/environment/environment-scanner";
import type { EnvironmentScan } from "../../main/environment/scanner";
export const environmentApi = {
	checkEnvironment: (): Promise<EnvironmentScan> => ipcRenderer.invoke("lazify:environment"),
	scanTools: (force = false): Promise<ToolScanReport> =>
		ipcRenderer.invoke("lazify:scan-tools", force),
	probeTool: (
		name: string,
	): Promise<import("../../main/environment/environment-scanner").DetectedTool | null> =>
		ipcRenderer.invoke("lazify:probe-tool", name),
	nvmListVersions: (): Promise<NvmVersionList> => ipcRenderer.invoke("lazify:nvm-list-versions"),
	installNvm: (): Promise<NvmInstallResult> => ipcRenderer.invoke("lazify:install-nvm"),
	nvmSetDefault: (version: string): Promise<NvmActionResult> =>
		ipcRenderer.invoke("lazify:nvm-set-default", version),
	nvmUse: (version: string): Promise<NvmActionResult> =>
		ipcRenderer.invoke("lazify:nvm-use", version),
	installTool: (toolName: string): Promise<NvmActionResult> =>
		ipcRenderer.invoke("lazify:install-tool", toolName),
	uninstallTool: (toolName: string): Promise<NvmActionResult> =>
		ipcRenderer.invoke("lazify:uninstall-tool", toolName),
	checkToolUpdate: (toolName: string, currentVersion: string): Promise<ToolUpdateInfo> =>
		ipcRenderer.invoke("lazify:check-tool-update", toolName, currentVersion),
	updateTool: (toolName: string): Promise<NvmActionResult> =>
		ipcRenderer.invoke("lazify:update-tool", toolName),
	listListeningProcesses: (): Promise<
		import("../../main/environment/port-reaper").ListeningProcess[]
	> => ipcRenderer.invoke("lazify:listening-processes"),
	killListeningProcess: (
		pid: number,
	): Promise<import("../../main/environment/port-reaper").KillResult> =>
		ipcRenderer.invoke("lazify:kill-listening-process", pid),
};
