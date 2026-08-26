import type { AgentSessionWindow, TokenTotals } from "../../../renderer/shared/types/lazify";
import { addTotals, emptyTotals } from "./totals";

/** Claude Code and Codex both meter usage in rolling 5-hour blocks. */
export const BLOCK_HOURS = 5;
/** Bumped whenever a cached slice's shape changes, which invalidates the file. */

/**
 * Both CLIs meter in rolling 5-hour blocks that open with the first message
 * after the previous block expired, so the same walk works for either: replay
 * the hourly buckets in order and cut a new block whenever the open one has
 * run out.
 */
export function currentBlock(
	hourly: Record<string, TokenTotals>,
	hourlyFirst: Record<string, string>,
	budget: number | null,
): AgentSessionWindow | null {
	const hours = Object.keys(hourly).sort((a, b) => a.localeCompare(b));

	if (hours.length === 0) return null;

	let startMs = 0;
	let totals = emptyTotals();

	for (const hour of hours) {
		// Hour keys are UTC, matching the timestamps they were derived from.
		const hourMs = Date.parse(`${hour}:00:00.000Z`);
		if (Number.isNaN(hourMs)) continue;

		if (startMs === 0 || hourMs >= startMs + BLOCK_HOURS * 3_600_000) {
			// The window opens with the first turn of the hour, not on the hour mark.
			const firstTurn = hourlyFirst[hour];
			startMs = firstTurn ? Date.parse(firstTurn) : hourMs;
			totals = emptyTotals();
		}

		addTotals(totals, hourly[hour]);
	}

	const resetsMs = startMs + BLOCK_HOURS * 3_600_000;

	// The last block has already expired, so nothing is metered right now and the
	// whole allowance is intact. Report that as an unspent window rather than as
	// an absence, so the bar keeps showing a percentage between blocks.
	if (resetsMs <= Date.now()) {
		return {
			source: "derived",
			startsAt: new Date().toISOString(),
			resetsAt: new Date(Date.now() + BLOCK_HOURS * 3_600_000).toISOString(),
			hours: BLOCK_HOURS,
			observedAt: null,
			totals: emptyTotals(),
			budget,
			usedPercent: 0,
		};
	}

	return {
		source: "derived",
		startsAt: new Date(startMs).toISOString(),
		resetsAt: new Date(resetsMs).toISOString(),
		hours: BLOCK_HOURS,
		observedAt: null,
		totals,
		budget,
		usedPercent: budget ? Math.min((totals.total / budget) * 100, 100) : null,
	};
}
