import { ipcRenderer } from "electron";

import type { PtySession, ScriptStatusEvent } from "../../renderer/shared/types/lazify";
import { subscribe } from "./subscribe";
export const scriptsApi = {
	listScripts: (projectPath: string): Promise<Record<string, string>> =>
		ipcRenderer.invoke("lazify:list-scripts", projectPath),
	runScript: (
		projectPath: string,
		scriptName: string,
		cols?: number,
		rows?: number,
	): Promise<{ runId: string; ptyAvailable: boolean }> =>
		ipcRenderer.invoke("lazify:run-script", projectPath, scriptName, cols, rows),
	stopScript: (runId: string): Promise<void> => ipcRenderer.invoke("lazify:stop-script", runId),
	restartScript: (
		runId: string,
		projectPath: string,
		scriptName: string,
		cols?: number,
		rows?: number,
	): Promise<{ runId: string; ptyAvailable: boolean }> =>
		ipcRenderer.invoke("lazify:restart-script", runId, projectPath, scriptName, cols, rows),
	listSessions: (): Promise<PtySession[]> => ipcRenderer.invoke("lazify:list-sessions"),
	ptyWrite: (runId: string, data: string): void => ipcRenderer.send("lazify:pty-write", runId, data),
	ptyBacklog: (runId: string): Promise<import("../../main/pty-runner").PtyBacklog> =>
		ipcRenderer.invoke("lazify:pty-backlog", runId),
	ptyResize: (runId: string, cols: number, rows: number): void =>
		ipcRenderer.send("lazify:pty-resize", runId, cols, rows),
	/** Saves whatever image is on the clipboard to a temp PNG; null if it's not an image. */
	onPtyData: (callback: (event: import("../../main/pty-runner").PtyDataEvent) => void) =>
		subscribe("lazify:pty-data", callback),
	onScriptStatus: (callback: (event: ScriptStatusEvent) => void) =>
		subscribe("lazify:script-status", callback),
	onSessionKilled: (callback: (event: { runId: string }) => void) =>
		subscribe("lazify:session-killed", callback),
};
