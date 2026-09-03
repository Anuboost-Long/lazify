import { ipcRenderer } from "electron";

import type { RecordedStep } from "../../main/diagnostic-tests/recorder/recorded-step";
import type { RecorderEvent } from "../../main/diagnostic-tests/recorder/recorder-session";
import type { RunSummary } from "../../main/diagnostic-tests/run/run-store";
import type { FlowSummary, RecordingHandle } from "../../main/diagnostic-tests/service";
import type {
	DiagnosticConfig,
	FlowSource,
	RunEvent,
	RunRecord,
} from "../../main/diagnostic-tests/types";
import { subscribe } from "./subscribe";

export const diagnosticTestsApi = {
	listDiagnosticFlows: (projectPath: string): Promise<FlowSummary[]> =>
		ipcRenderer.invoke("lazify:list-diagnostic-flows", projectPath),
	saveDiagnosticFlow: (projectPath: string, fileName: string, text: string): Promise<FlowSource> =>
		ipcRenderer.invoke("lazify:save-diagnostic-flow", projectPath, fileName, text),
	deleteDiagnosticFlow: (projectPath: string, fileName: string): Promise<void> =>
		ipcRenderer.invoke("lazify:delete-diagnostic-flow", projectPath, fileName),
	createExampleDiagnosticFlow: (projectPath: string): Promise<FlowSource> =>
		ipcRenderer.invoke("lazify:create-example-diagnostic-flow", projectPath),
	startDiagnosticRun: (projectPath: string, fileName: string): Promise<RunRecord> =>
		ipcRenderer.invoke("lazify:start-diagnostic-run", projectPath, fileName),
	cancelDiagnosticRun: (runId: string): Promise<boolean> =>
		ipcRenderer.invoke("lazify:cancel-diagnostic-run", runId),
	listDiagnosticRuns: (projectPath: string, limit?: number): Promise<RunSummary[]> =>
		ipcRenderer.invoke("lazify:list-diagnostic-runs", projectPath, limit),
	readDiagnosticRun: (runId: string): Promise<RunRecord | null> =>
		ipcRenderer.invoke("lazify:read-diagnostic-run", runId),
	deleteDiagnosticRun: (runId: string): Promise<void> =>
		ipcRenderer.invoke("lazify:delete-diagnostic-run", runId),
	clearDiagnosticRuns: (projectPath: string): Promise<void> =>
		ipcRenderer.invoke("lazify:clear-diagnostic-runs", projectPath),
	readDiagnosticConfig: (projectPath: string): Promise<DiagnosticConfig> =>
		ipcRenderer.invoke("lazify:read-diagnostic-config", projectPath),
	saveDiagnosticConfig: (projectPath: string, config: DiagnosticConfig): Promise<DiagnosticConfig> =>
		ipcRenderer.invoke("lazify:save-diagnostic-config", projectPath, config),
	chooseDiagnosticFolder: (defaultPath: string): Promise<string | null> =>
		ipcRenderer.invoke("lazify:choose-diagnostic-folder", defaultPath),
	startDiagnosticRecording: (projectPath: string, url: string): Promise<RecordingHandle> =>
		ipcRenderer.invoke("lazify:start-diagnostic-recording", projectPath, url),
	stopDiagnosticRecording: (): Promise<RecordedStep[]> =>
		ipcRenderer.invoke("lazify:stop-diagnostic-recording"),
	saveDiagnosticRecording: (
		projectPath: string,
		fileName: string,
		name: string,
		steps: RecordedStep[],
	): Promise<FlowSource> =>
		ipcRenderer.invoke("lazify:save-diagnostic-recording", projectPath, fileName, name, steps),
	exportDiagnosticReport: (runId: string): Promise<string | null> =>
		ipcRenderer.invoke("lazify:export-diagnostic-report", runId),
	onDiagnosticRunEvent: (callback: (event: RunEvent) => void) =>
		subscribe("lazify:diagnostic-run-event", callback),
	onDiagnosticRecorderEvent: (callback: (event: RecorderEvent) => void) =>
		subscribe("lazify:diagnostic-recorder-event", callback),
};
