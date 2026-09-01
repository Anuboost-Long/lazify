import type { MonitorPanel, MonitorPanelSize } from "./use-monitor-panels";

/**
 * Tidying up is about what is worth reading, not what is worth watching.
 *
 * How much a run has printed says nothing about whether it needs the space —
 * an installer scrolls for minutes and can be read in a thumbnail, while a diff
 * or a stack trace is unreadable in a narrow column the moment it appears. So
 * the size a panel is given comes from how its visible output is laid out, and
 * a panel with nothing demanding on screen keeps the small size it had, still
 * running, whatever its position in the order.
 */

/** Columns of text, wrapping lines: this one is being read, not watched. */
const DEEP = 0.55;

/** Enough structure to be awkward in one column, not enough to take two rows. */
const INVOLVED = 0.25;

const MAX_ENLARGED_PANELS = 3;

export interface TidyPlan {
	order: string[];
	sizes: Record<string, MonitorPanelSize>;
}

export interface TidyInput {
	panels: MonitorPanel[];
	waitingRunIds: string[];
	/** How much has scrolled out of sight — used to rank, never to size. */
	overflowScreens: (runId: string) => number;
	/** How much room the visible output needs, from 0 to 1. */
	readingDemand: (runId: string) => number;
	/** How much of what ran was plumbing, from 0 to 1. */
	routineWork: (runId: string) => number;
	/**
	 * Columns the wall actually has right now, which is a fact about the window
	 * rather than a setting — the same layout is three columns on a desktop and
	 * one on a laptop in a split.
	 */
	columns: number;
}

/** Most of what ran was plumbing — pushing, installing, moving files about. */
const ROUTINE = 0.6;

/**
 * Hands out sizes that actually tile, filling the wall left to right.
 *
 * A panel two columns wide cannot start in the last column of a row: the grid
 * pushes it down and leaves the cell it skipped empty. A tall panel is worse,
 * because it eats into the row below as well. So a size is only granted when
 * the space is there, and a panel that cannot have what it earned takes a
 * single cell and fills the gap instead of opening one.
 *
 * With one column nothing can span, which is also what the panel's own
 * breakpoints do — the size is carried but not drawn.
 */
function openRow(columns: number) {
	let free = columns;
	let takenBelow = 0;

	const advance = (span: number) => {
		free -= span;

		while (free <= 0) {
			free = columns - takenBelow;
			takenBelow = 0;
		}
	};

	return {
		place(size: MonitorPanelSize): MonitorPanelSize {
			const granted = columns < 2 || free < 2 ? "default" : size;

			if (granted === "large") takenBelow += 2;

			advance(granted === "default" ? 1 : 2);

			return granted;
		},
	};
}

function attentionRank(runId: string, waiting: Set<string>) {
	return waiting.has(runId) ? 0 : 1;
}

function kindRank(panel: MonitorPanel) {
	if (panel.exited) return 2;

	return panel.kind === "agent" ? 0 : 1;
}

export function planTidyUp({
	panels,
	waitingRunIds,
	overflowScreens,
	readingDemand,
	routineWork,
	columns,
}: TidyInput): TidyPlan {
	const waiting = new Set(waitingRunIds);

	/**
	 * Errands sink below real work. Only when there is nothing to read on them,
	 * though — a push that was rejected, or an install that failed, is an errand
	 * that has become the most interesting thing on the wall.
	 */
	const errandRank = (runId: string) =>
		routineWork(runId) >= ROUTINE && readingDemand(runId) < INVOLVED ? 1 : 0;

	const ranked = [...panels].sort((left, right) => {
		const byAttention = attentionRank(left.runId, waiting) - attentionRank(right.runId, waiting);
		if (byAttention !== 0) return byAttention;

		const byKind = kindRank(left) - kindRank(right);
		if (byKind !== 0) return byKind;

		const byErrand = errandRank(left.runId) - errandRank(right.runId);
		if (byErrand !== 0) return byErrand;

		return overflowScreens(right.runId) - overflowScreens(left.runId);
	});

	const sizes: Record<string, MonitorPanelSize> = {};
	let enlarged = 0;

	/** What the panel has earned, before the grid gets a say. */
	const wanted = (panel: MonitorPanel, index: number): MonitorPanelSize => {
		if (panel.exited) return "default";

		const demand = readingDemand(panel.runId);

		if (demand < INVOLVED || enlarged >= MAX_ENLARGED_PANELS) return "default";

		// Two rows go to the one panel being read, and only when what is on it
		// genuinely fills them.
		return index === 0 && demand >= DEEP ? "large" : "wide";
	};

	const row = openRow(columns);

	ranked.forEach((panel, index) => {
		const size = row.place(wanted(panel, index));

		sizes[panel.runId] = size;
		if (size !== "default") enlarged += 1;
	});

	return { order: ranked.map((panel) => panel.runId), sizes };
}
