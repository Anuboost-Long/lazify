import { dialog, ipcMain } from "electron";

import { DiagnosticTestService } from "../diagnostic-tests";
import type { RecordedStep } from "../diagnostic-tests/recorder/recorded-step";
import type { DiagnosticConfig } from "../diagnostic-tests/types";
import type { IpcContext } from "./context";

const RUN_EVENT_CHANNEL = "lazify:diagnostic-run-event";
const RECORDER_EVENT_CHANNEL = "lazify:diagnostic-recorder-event";

export function registerDiagnosticTestHandlers(ctx: IpcContext) {
	const service = new DiagnosticTestService(
		(event) => ctx.emitToRenderer(RUN_EVENT_CHANNEL, event),
		(event) => ctx.emitToRenderer(RECORDER_EVENT_CHANNEL, event),
		ctx.ptyRunner,
	);

	ipcMain.handle("lazify:list-diagnostic-flows", async (_event, projectPath: string) =>
		service.listFlows(projectPath),
	);

	ipcMain.handle(
		"lazify:save-diagnostic-flow",
		async (_event, projectPath: string, fileName: string, text: string) =>
			service.saveFlow(projectPath, fileName, text),
	);

	ipcMain.handle(
		"lazify:delete-diagnostic-flow",
		async (_event, projectPath: string, fileName: string) =>
			service.deleteFlow(projectPath, fileName),
	);

	ipcMain.handle("lazify:create-example-diagnostic-flow", async (_event, projectPath: string) =>
		service.createExampleFlow(projectPath),
	);

	ipcMain.handle(
		"lazify:start-diagnostic-run",
		async (_event, projectPath: string, fileName: string) => service.startRun(projectPath, fileName),
	);

	ipcMain.handle("lazify:cancel-diagnostic-run", async (_event, runId: string) =>
		service.cancelRun(runId),
	);

	ipcMain.handle(
		"lazify:list-diagnostic-runs",
		async (_event, projectPath: string, limit?: number) => service.listRuns(projectPath, limit),
	);

	ipcMain.handle("lazify:read-diagnostic-run", async (_event, runId: string) =>
		service.readRun(runId),
	);

	ipcMain.handle("lazify:delete-diagnostic-run", async (_event, runId: string) =>
		service.deleteRun(runId),
	);

	ipcMain.handle("lazify:clear-diagnostic-runs", async (_event, projectPath: string) =>
		service.clearRuns(projectPath),
	);

	ipcMain.handle("lazify:read-diagnostic-config", async (_event, projectPath: string) =>
		service.readConfig(projectPath),
	);

	ipcMain.handle(
		"lazify:save-diagnostic-config",
		async (_event, projectPath: string, config: DiagnosticConfig) =>
			service.saveConfig(projectPath, config),
	);

	ipcMain.handle(
		"lazify:start-diagnostic-recording",
		async (_event, projectPath: string, url: string) => service.startRecording(projectPath, url),
	);

	ipcMain.handle("lazify:stop-diagnostic-recording", async () => service.stopRecording());

	ipcMain.handle(
		"lazify:save-diagnostic-recording",
		async (_event, projectPath: string, fileName: string, name: string, steps: RecordedStep[]) =>
			service.saveRecording(projectPath, fileName, name, steps),
	);

	ipcMain.handle("lazify:choose-diagnostic-folder", async (_event, defaultPath: string) => {
		const options = { title: "Choose a folder", defaultPath, properties: ["openDirectory" as const] };

		const result = ctx.mainWindow
			? await dialog.showOpenDialog(ctx.mainWindow, options)
			: await dialog.showOpenDialog(options);

		return result.canceled ? null : (result.filePaths[0] ?? null);
	});

	ipcMain.handle("lazify:export-diagnostic-report", async (_event, runId: string) => {
		const options = {
			title: "Where should the report go?",
			defaultPath: `diagnostic-run-${runId}.html`,
			filters: [{ name: "HTML report", extensions: ["html"] }],
		};

		const result = ctx.mainWindow
			? await dialog.showSaveDialog(ctx.mainWindow, options)
			: await dialog.showSaveDialog(options);

		if (result.canceled || !result.filePath) return null;

		return service.exportReport(runId, result.filePath);
	});
}
