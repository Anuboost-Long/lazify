import { ipcMain } from "electron";

import {
	formatChangedFiles,
	formatSample,
	getFormatterSettings,
	readProjectFormatter,
	setFormatterDefaults,
	setFormatterMode,
	setOrganizeImports,
} from "../formatting";
import type { FormatMode, FormatterDefaults } from "../formatting";

export function registerFormattingHandlers() {
	ipcMain.handle("lazify:formatter-settings", async () => getFormatterSettings());

	ipcMain.handle("lazify:set-formatter-mode", async (_event, mode: FormatMode) =>
		setFormatterMode(mode),
	);

	ipcMain.handle("lazify:set-organize-imports", async (_event, enabled: boolean) =>
		setOrganizeImports(enabled),
	);

	ipcMain.handle(
		"lazify:set-formatter-defaults",
		async (_event, defaults: Partial<FormatterDefaults>) => setFormatterDefaults(defaults),
	);

	// Asked before formatting so the panel can name the rules it is about to
	// apply, rather than reporting which ones it used after the fact.
	ipcMain.handle("lazify:project-formatter", async (_event, projectPath: string) =>
		readProjectFormatter(projectPath),
	);

	ipcMain.handle("lazify:format-sample", async (_event, defaults: FormatterDefaults) =>
		formatSample(defaults),
	);

	ipcMain.handle(
		"lazify:format-changed-files",
		async (_event, projectPath: string, only?: string[], mode?: "write" | "preview") =>
			formatChangedFiles(projectPath, only, mode),
	);
}
