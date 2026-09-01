import { ipcRenderer } from "electron";

import type {
	FixTaskInput,
	LintResult,
	PhaseTaskRequest,
	SonarScanState,
} from "../../main/linting";
import type { Task } from "../../main/tasks/types";
import { subscribe } from "./subscribe";
export const lintingApi = {
	lintFile: (filePath: string, content: string): Promise<LintResult> =>
		ipcRenderer.invoke("lazify:lint-file", filePath, content),
	createFixTask: (input: FixTaskInput): Promise<Task | null> =>
		ipcRenderer.invoke("lazify:create-fix-task", input),
	startSonarScan: (projectPath: string): Promise<SonarScanState> =>
		ipcRenderer.invoke("lazify:start-sonar-scan", projectPath),
	stopSonarScan: (projectPath: string): Promise<SonarScanState> =>
		ipcRenderer.invoke("lazify:stop-sonar-scan", projectPath),
	sonarScanState: (projectPath: string): Promise<SonarScanState> =>
		ipcRenderer.invoke("lazify:sonar-scan-state", projectPath),
	createPhaseTasks: (request: PhaseTaskRequest): Promise<Task[]> =>
		ipcRenderer.invoke("lazify:create-phase-tasks", request),
	onSonarScan: (callback: (state: SonarScanState) => void) =>
		subscribe("lazify:sonar-scan", callback),
};
