import type { TokenTotals } from "../../../renderer/shared/types/lazify";
import type { FileSlice } from "./cache";

export const DAILY_HISTORY_DAYS = 30;
/** Hourly detail is only kept long enough to resolve the current 5-hour block. */

/** Hourly detail is only kept long enough to resolve the current 5-hour block. */
export const HOURLY_HISTORY_DAYS = 3;
/** Claude Code and Codex both meter usage in rolling 5-hour blocks. */

export function emptyTotals(): TokenTotals {
	return {
		input: 0,
		output: 0,
		cacheRead: 0,
		cacheWrite: 0,
		total: 0,
		messages: 0,
	};
}

export function addTotals(target: TokenTotals, source: TokenTotals): void {
	target.input += source.input;
	target.output += source.output;
	target.cacheRead += source.cacheRead;
	target.cacheWrite += source.cacheWrite;
	target.total += source.total;
	target.messages += source.messages;
}

function dayKey(timestamp: string): string {
	return timestamp.slice(0, 10);
}

export function hourKey(timestamp: string): string {
	return timestamp.slice(0, 13);
}

/** Folds one turn's tokens into both the daily and hourly buckets. */

/** Folds one turn's tokens into both the daily and hourly buckets. */
export function record(slice: FileSlice, timestamp: string, totals: TokenTotals): void {
	const day = dayKey(timestamp);
	const hour = hourKey(timestamp);

	slice.daily[day] ??= emptyTotals();
	addTotals(slice.daily[day], totals);

	slice.hourly[hour] ??= emptyTotals();
	addTotals(slice.hourly[hour], totals);

	const first = slice.hourlyFirst[hour];
	if (!first || timestamp < first) slice.hourlyFirst[hour] = timestamp;
}

/** Drops hourly detail past the retention window so the cache stays small. */

/** Drops hourly detail past the retention window so the cache stays small. */
export function pruneHourly(slice: FileSlice, cutoffHour: string): void {
	for (const hour of Object.keys(slice.hourly)) {
		if (hour < cutoffHour) {
			delete slice.hourly[hour];
			delete slice.hourlyFirst[hour];
		}
	}
}

/**
 * Both CLIs meter in rolling 5-hour blocks that open with the first message
 * after the previous block expired, so the same walk works for either: replay
 * the hourly buckets in order and cut a new block whenever the open one has
 * run out.
 */
