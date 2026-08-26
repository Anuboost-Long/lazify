import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { TokenTotals } from "../../../renderer/shared/types/lazify";
import { FileSlice, readCache } from "./cache";
import { HOURLY_HISTORY_DAYS, addTotals, emptyTotals, hourKey, pruneHourly } from "./totals";
import { listFiles, readLines } from "./transcripts";

/** Re-reads only what changed, then returns every cached slice for the agent. */
export async function scanAgent(
	agentId: string,
	files: string[],
	parseLine: (line: string, slice: FileSlice) => void,
): Promise<FileSlice[]> {
	const store = readCache();
	const agentCache = (store.agents[agentId] ??= {});
	const seen = new Set<string>();

	for (const filePath of files) {
		seen.add(filePath);

		let stat: fs.Stats;

		try {
			stat = fs.statSync(filePath);
		} catch {
			continue;
		}

		const cached = agentCache[filePath];

		if (cached?.size === stat.size && cached.mtimeMs === stat.mtimeMs) continue;

		// A file that shrank was rewritten, so its cached totals can't be trusted.
		const reusable = cached && stat.size >= cached.offset ? cached : null;
		const slice: FileSlice = reusable ?? {
			size: 0,
			mtimeMs: 0,
			offset: 0,
			daily: {},
			hourly: {},
			hourlyFirst: {},
			lastActivity: null,
			rateLimit: null,
		};

		await readLines(filePath, slice.offset, (line) => parseLine(line, slice));

		slice.size = stat.size;
		slice.mtimeMs = stat.mtimeMs;
		slice.offset = stat.size;
		agentCache[filePath] = slice;
	}

	const cutoffHour = hourKey(
		new Date(Date.now() - HOURLY_HISTORY_DAYS * 24 * 3_600_000).toISOString(),
	);

	for (const filePath of Object.keys(agentCache)) {
		// Drop transcripts the user deleted so the cache doesn't grow forever.
		if (!seen.has(filePath)) {
			delete agentCache[filePath];
			continue;
		}

		pruneHourly(agentCache[filePath], cutoffHour);
	}

	return Object.values(agentCache);
}

export function claudeFiles(): string[] {
	return listFiles(path.join(os.homedir(), ".claude", "projects"), 2);
}

export function codexFiles(): string[] {
	return listFiles(path.join(os.homedir(), ".codex", "sessions"), 4);
}

/** Usage recorded after `sinceIso`, read only from transcripts touched since. */

/** Usage recorded after `sinceIso`, read only from transcripts touched since. */
export async function scanSince(
	files: string[],
	sinceIso: string,
	parseLine: (line: string, slice: FileSlice) => void,
): Promise<TokenTotals> {
	const sinceMs = Date.parse(sinceIso);
	const totals = emptyTotals();

	for (const filePath of files) {
		try {
			if (fs.statSync(filePath).mtimeMs < sinceMs) continue;
		} catch {
			continue;
		}

		// The parsers drop anything stamped before the session started, so what
		// lands in this throwaway slice is exactly the session's own turns.
		const slice: FileSlice = {
			size: 0,
			mtimeMs: 0,
			offset: 0,
			daily: {},
			hourly: {},
			hourlyFirst: {},
			lastActivity: null,
			rateLimit: null,
			since: sinceIso,
		};

		await readLines(filePath, 0, (line) => parseLine(line, slice));

		for (const totalsForDay of Object.values(slice.daily)) {
			addTotals(totals, totalsForDay);
		}
	}

	return totals;
}

/**
 * Prefers the account's own 5-hour percentage when one is current, keeping the
 * locally derived token counts alongside it; otherwise falls back to the block
 * walked out of the transcripts.
 */
