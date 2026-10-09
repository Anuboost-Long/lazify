import type { WorkflowContext, WorkflowProgressEvent } from "@/shared/lib/scaffolding/workflow/types";

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
