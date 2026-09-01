import { ipcRenderer } from "electron";

import type {
	CreateProjectPayload,
	InstallPackagePayload,
	WorkflowProgressEvent,
	WorkflowResult,
} from "../../main/scaffolding/workflow-engine";
import { subscribe } from "./subscribe";
export const workflowApi = {
	createProject: (payload: CreateProjectPayload): Promise<WorkflowResult> =>
		ipcRenderer.invoke("lazify:create-project", payload),
	installPackage: (payload: InstallPackagePayload): Promise<WorkflowResult> =>
		ipcRenderer.invoke("lazify:install-package", payload),
	onWorkflowProgress: (callback: (event: WorkflowProgressEvent) => void) =>
		subscribe("lazify:workflow-progress", callback),
};
