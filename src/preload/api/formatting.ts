import { ipcRenderer } from "electron";

import type {
	FormatMode,
	FormatOutcome,
	FormatterDefaults,
	FormatterSettings,
	ProjectFormatter,
} from "../../main/formatting";
import { subscribe } from "./subscribe";
export const formattingApi = {
	formatterSettings: (): Promise<FormatterSettings> =>
		ipcRenderer.invoke("lazify:formatter-settings"),
	setFormatterMode: (mode: FormatMode): Promise<FormatterSettings> =>
		ipcRenderer.invoke("lazify:set-formatter-mode", mode),
	setOrganizeImports: (enabled: boolean): Promise<FormatterSettings> =>
		ipcRenderer.invoke("lazify:set-organize-imports", enabled),
	setFormatterDefaults: (defaults: Partial<FormatterDefaults>): Promise<FormatterSettings> =>
		ipcRenderer.invoke("lazify:set-formatter-defaults", defaults),
	formatSample: (defaults: FormatterDefaults): Promise<string> =>
		ipcRenderer.invoke("lazify:format-sample", defaults),
	projectFormatter: (projectPath: string): Promise<ProjectFormatter> =>
		ipcRenderer.invoke("lazify:project-formatter", projectPath),
	formatChangedFiles: (
		projectPath: string,
		only?: string[],
		mode?: "write" | "preview",
	): Promise<FormatOutcome> =>
		ipcRenderer.invoke("lazify:format-changed-files", projectPath, only, mode),
	onCodeFormatted: (callback: (event: FormatOutcome & { projectPath: string }) => void) =>
		subscribe("lazify:code-formatted", callback),
};
