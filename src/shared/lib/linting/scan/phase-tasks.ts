import type { Task } from "@/shared/lib/tasks/types";

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

export async function createPhaseTasks({
	projectPath,
	phaseCount,
	presetId = null,
}: PhaseTaskRequest): Promise<Task[]> {
	const { report } = await sonarScanState(projectPath);

	if (!report || report.files.length === 0) return [];

	const phases = planFixPhases(report.files, phaseCount);
	const tasks: Task[] = [];

	// One at a time, so the board lists the phases in the order they are worked.
	for (const phase of phases) {
		const task = await createFixTask({
			projectPath,
			presetId,
			label: phases.length > 1 ? `Phase ${phase.index} of ${phases.length}` : null,
			findings: phase.files.flatMap((file) => file.findings),
		});

		if (task) tasks.push(task);
	}

	return tasks;
}
