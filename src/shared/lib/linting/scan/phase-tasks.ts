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
