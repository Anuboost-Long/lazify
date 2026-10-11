import { scanEnvironment } from "../../environment/scanner";
import { finalizeProject } from "./finalize";
import { prepareProject } from "./prepare";
import type { CreateProjectPayload, WorkflowContext, WorkflowResult } from "./types";

export async function createProject(
	ctx: WorkflowContext,
	payload: CreateProjectPayload,
): Promise<WorkflowResult> {
	const environment = await scanEnvironment();

	if (environment.issues.length > 0) {
		throw new Error(environment.issues.join(" "));
	}

	// Ticket 026 ports creating from an imported template.
	if (payload.sourceMode === "imported") {
		throw new Error("Managing templates isn't available in Lazify Chain yet.");
	}

	// Provision and finish in one operation; the init flow goes straight to
	// the Console while this work runs.
	const prepared = await prepareProject(ctx, payload);

	if (!prepared.success || !prepared.projectPath) {
		return { success: false, message: prepared.message, reason: prepared.reason };
	}

	return finalizeProject(ctx, { projectPath: prepared.projectPath });
}
