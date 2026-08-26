import { ipcMain } from "electron";

import { createFixTask, lintFile, type FixTaskInput } from "../linting";

export function registerLintingHandlers() {
	// The buffer comes along rather than being read back off disk: the editor
	// underlines what is on screen, which is not yet what is saved. Nothing here
	// touches the file system, so the path is only ever a name and an extension.
	ipcMain.handle("lazify:lint-file", async (_event, filePath: string, content: string) =>
		lintFile(filePath, content),
	);

	// Findings written down as a task, so a batch outlives the editor session
	// that found it — and carries enough with it to be worked on later.
	ipcMain.handle("lazify:create-fix-task", async (_event, input: FixTaskInput) =>
		createFixTask(input),
	);
}
