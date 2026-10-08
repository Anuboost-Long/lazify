import type { ScanFileFindings } from "./types";

/**
 * A scan's findings, cut into rounds of work.
 *
 * Two rules decide every cut. A file is never split across phases, because two
 * agents editing the same file is a conflict nobody asked for; and files are
 * taken in path order, so a phase lands on neighbouring code that reads as one
 * errand rather than a scattering of unrelated fixes.
 *
 * Between those, phases carry roughly the same number of findings — the cut
 * points follow the running total, so one enormous file does not drag every
 * later phase off balance.
 *
 * Pure on purpose: the panel previews the same split the tasks are written
 * from, so what a user approves is what gets created.
 */

export interface FixPhase {
	/** 1-based, which is how phases are named everywhere they are shown. */
	index: number;
	files: ScanFileFindings[];
	findingCount: number;
}

/** More rounds than this and the plan is longer than the work. */
export const MAX_PHASES = 8;

export function phaseOptions(fileCount: number): number[] {
	const most = Math.min(MAX_PHASES, Math.max(1, fileCount));

	return Array.from({ length: most }, (_, index) => index + 1);
}

export function planFixPhases(files: ScanFileFindings[], phaseCount: number): FixPhase[] {
	if (files.length === 0) return [];

	const ordered = [...files].sort((left, right) => left.path.localeCompare(right.path));
	const count = Math.min(Math.max(1, Math.trunc(phaseCount)), ordered.length);
	const total = ordered.reduce((sum, file) => sum + file.findings.length, 0);

	const phases: FixPhase[] = [];
	let carried: ScanFileFindings[] = [];
	let placed = 0;

	const close = () => {
		phases.push({
			index: phases.length + 1,
			files: carried,
			findingCount: carried.reduce((sum, file) => sum + file.findings.length, 0),
		});
		carried = [];
	};

	for (const [position, file] of ordered.entries()) {
		carried.push(file);
		placed += file.findings.length;

		const phasesAfterThis = count - phases.length - 1;

		if (phasesAfterThis === 0) continue;

		/** Every file still to come is needed to give the later phases a file. */
		const forced = ordered.length - position - 1 === phasesAfterThis;

		if (forced || placed >= (total * (phases.length + 1)) / count) close();
	}

	if (carried.length > 0) close();

	return phases;
}

/** The deepest folder every file in a phase sits under, for naming the round. */
export function commonFolder(files: ScanFileFindings[]): string {
	if (files.length === 0) return "";

	const segments = files.map((file) => file.path.split("/").slice(0, -1));

	return segments
		.reduce((shared, parts) => {
			let shares = 0;

			while (shares < shared.length && shared[shares] === parts[shares]) shares += 1;

			return shared.slice(0, shares);
		}, segments[0])
		.join("/");
}
