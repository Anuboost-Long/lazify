import type { FindingReference } from "./types";

export interface FixTaskInput {
	projectPath: string;
	findings: FindingReference[];
	/** Preset the prompt is usually built with, or null to decide each time. */
	presetId?: string | null;
	/**
	 * The round this batch belongs to, e.g. `Phase 2 of 4`. It leads the name so
	 * a board holding a whole scan reads in the order it is meant to be worked.
	 */
	label?: string | null;
}
