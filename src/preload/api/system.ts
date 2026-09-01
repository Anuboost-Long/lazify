import { ipcRenderer, webUtils } from "electron";

import type { HighlightingAssets } from "../../main/code-intelligence/highlighting-store";
import type { CommandChoicePrompt, LogEvent } from "../../main/command-runner";
import type { DiagnosticsPaths } from "../../main/diagnostics/logger";
import { subscribe } from "./subscribe";
export const systemApi = {
	/**
	 * What the app is running on, so the renderer can hide features that only
	 * exist on one OS — building a disk image, for one.
	 */
	platform: process.platform,
	runCommand: (command: string, args: string[], cwd?: string) =>
		ipcRenderer.invoke("lazify:run-command", command, args, cwd),
	chooseCommandOption: (promptId: string, optionId: string): Promise<boolean> =>
		ipcRenderer.invoke("lazify:choose-command-option", promptId, optionId),
	relaunchApp: (): Promise<void> => ipcRenderer.invoke("lazify:relaunch"),

	// Tells the main process React has painted, which is what dismisses the splash
	// and shows the window.
	signalRendererReady: (): void => ipcRenderer.send("lazify:renderer-ready"),
	selectDirectory: (): Promise<string | null> => ipcRenderer.invoke("lazify:select-directory"),
	selectDirectories: (): Promise<string[]> => ipcRenderer.invoke("lazify:select-directories"),
	selectPaths: (defaultPath?: string | null): Promise<string[]> =>
		ipcRenderer.invoke("lazify:select-paths", defaultPath),
	getDiagnosticsPaths: (): Promise<DiagnosticsPaths> =>
		ipcRenderer.invoke("lazify:diagnostics-paths"),
	saveClipboardImage: (): Promise<string | null> =>
		ipcRenderer.invoke("lazify:save-clipboard-image"),
	pathForDroppedFile: (file: File): string => {
		try {
			return webUtils.getPathForFile(file);
		} catch {
			// Something that came from somewhere other than the filesystem — a drag
			// out of a web page, say. It has no path, and the caller offers a picker.
			return "";
		}
	},
	// DMG compiler: pick an app, pick where the image goes, build it.
	listHighlightingAssets: (): Promise<HighlightingAssets> =>
		ipcRenderer.invoke("lazify:highlighting-assets"),
	openHighlightingFolder: (): Promise<void> => ipcRenderer.invoke("lazify:open-highlighting-folder"),
	revealInFileManager: (targetPath: string): Promise<void> =>
		ipcRenderer.invoke("lazify:reveal-in-file-manager", targetPath),
	detectEditors: (): Promise<import("../../main/environment/editor-catalog").DetectedEditor[]> =>
		ipcRenderer.invoke("lazify:detect-editors"),
	openInEditor: (
		request: import("../../main/environment/open-in-editor").OpenInEditorRequest,
	): Promise<import("../../main/environment/open-in-editor").OpenInEditorResult> =>
		ipcRenderer.invoke("lazify:open-in-editor", request),
	openTerminal: (targetPath: string): Promise<void> =>
		ipcRenderer.invoke("lazify:open-terminal", targetPath),
	openExternalUrl: (url: string): Promise<void> =>
		ipcRenderer.invoke("lazify:open-external-url", url),
	chooseUploadFile: (): Promise<string | null> => ipcRenderer.invoke("lazify:choose-upload-file"),
	readZoom: (): Promise<number> => ipcRenderer.invoke("lazify:read-zoom"),
	setZoom: (factor: number): Promise<number> => ipcRenderer.invoke("lazify:set-zoom", factor),
	stepZoom: (direction: 1 | -1): Promise<number> =>
		ipcRenderer.invoke("lazify:step-zoom", direction),
	resetZoom: (): Promise<number> => ipcRenderer.invoke("lazify:reset-zoom"),
	onZoomChanged: (callback: (factor: number) => void) => subscribe("lazify:zoom-changed", callback),
	onLog: (callback: (event: LogEvent) => void) => subscribe("lazify:log", callback),
	onCommandChoicePrompt: (callback: (prompt: CommandChoicePrompt) => void) =>
		subscribe("lazify:command-choice-prompt", callback),
};
