import { ipcMain } from "electron";

import {
	createFixTask,
	createPhaseTasks,
	lintFile,
	sonarScanState,
	startSonarScan,
	stopSonarScan,
	type FixTaskInput,
	type PhaseTaskRequest,
} from "../linting";
import type { IpcContext } from "./context";

export function registerLintingHandlers(ctx: IpcContext) {
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

	// The scan answers with the state it starts in and then keeps talking: the
	// caller is not waiting on this promise for minutes, it is watching the
	// progress channel.
	ipcMain.handle("lazify:start-sonar-scan", async (_event, projectPath: string) => {
		void startSonarScan(projectPath, (state) => ctx.emitToRenderer("lazify:sonar-scan", state));

		return sonarScanState(projectPath);
	});

	ipcMain.handle("lazify:stop-sonar-scan", async (_event, projectPath: string) =>
		stopSonarScan(projectPath),
	);

	// What the panel opens on: a run already in flight, or the last report.
	ipcMain.handle("lazify:sonar-scan-state", async (_event, projectPath: string) =>
		sonarScanState(projectPath),
	);

	ipcMain.handle("lazify:create-phase-tasks", async (_event, request: PhaseTaskRequest) =>
		createPhaseTasks(request),
	);
}
