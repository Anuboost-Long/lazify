import type { Task } from "../../tasks";
import { createFixTask } from "../fix-task";
import { planFixPhases } from "./phase-plan";
import { sonarScanState } from "./scan-runner";

/**
 * A scan turned into the rounds it will be fixed in.
 *
 * The split is planned from the report the panel is showing, not from anything
 * sent back with the request, so the tasks that land are the phases the user
 * approved. Each round is a task of its own: the board keeps them in order, and
 * a round can be handed to an agent, paused, or dropped without touching the
 * others.
 */

export interface PhaseTaskRequest {
	projectPath: string;
	phaseCount: number;
	presetId?: string | null;
}

export function createPhaseTasks({
	projectPath,
	phaseCount,
	presetId = null,
}: PhaseTaskRequest): Task[] {
	const { report } = sonarScanState(projectPath);

	if (!report || report.files.length === 0) return [];

	const phases = planFixPhases(report.files, phaseCount);

	return phases
		.map((phase) =>
			createFixTask({
				projectPath,
				presetId,
				label: phases.length > 1 ? `Phase ${phase.index} of ${phases.length}` : null,
				findings: phase.files.flatMap((file) => file.findings),
			}),
		)
		.filter((task): task is Task => task !== null);
}
