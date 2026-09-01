import { scanEnvironment } from "../../environment/scanner";
import { finalizeProject } from "./finalize";
import { createProjectFromImportedTemplate, prepareProject } from "./prepare";
import type { CreateProjectPayload, WorkflowContext, WorkflowResult } from "./types";

export async function createProject(
	ctx: WorkflowContext,
	payload: CreateProjectPayload,
): Promise<WorkflowResult> {
	const workflowId = `create-${Date.now()}`;
	const environment = scanEnvironment();

	if (environment.issues.length > 0) {
		throw new Error(environment.issues.join(" "));
	}

	if (payload.sourceMode === "imported") {
		return createProjectFromImportedTemplate(ctx, payload, workflowId);
	}

	// Provision and finish in one operation; the init flow goes straight to
	// the Console while this work runs.
	const prepared = await prepareProject(ctx, payload);

	if (!prepared.success || !prepared.projectPath) {
		return { success: false, message: prepared.message, reason: prepared.reason };
	}

	return finalizeProject(ctx, { projectPath: prepared.projectPath });
}

/**
 * Step one of two. Produces a temporary project tree — a starter clone or the
 * framework CLI's output — and stops there, so the picker can browse the real
 * thing before it is placed in the workspace. `finalizeProject` finishes the
 * job, and `discardPreparedProject` backs it out.
 */
