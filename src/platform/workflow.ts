import { scanEnvironment } from "@/shared/lib/environment/scanner";
import { getTemplate, listTemplates as readTemplates } from "@/shared/lib/scaffolding/harmonizer";
import { listTemplatePackageEntries } from "@/shared/lib/scaffolding/template-package-manifest";
import { createProject as create } from "@/shared/lib/scaffolding/workflow/create";
import type {
	CreateProjectPayload,
	WorkflowContext,
	WorkflowProgressEvent,
} from "@/shared/lib/scaffolding/workflow/types";

import { commandRunner } from "./commands";

const progressListeners = new Set<(event: WorkflowProgressEvent) => void>();

export const workflow: WorkflowContext = {
	commandRunner,
	emitProgress: (event) => {
		for (const listener of progressListeners) listener(event);
	},
};

export function onWorkflowProgress(callback: (event: WorkflowProgressEvent) => void): () => void {
	progressListeners.add(callback);

	return () => {
		progressListeners.delete(callback);
	};
}

export const createProject = (payload: CreateProjectPayload) => create(workflow, payload);

export const listTemplates = async () => readTemplates();

export const getTemplatePackageManifest = async (templateId: string) =>
	listTemplatePackageEntries(getTemplate(templateId));

export const checkEnvironment = scanEnvironment;
