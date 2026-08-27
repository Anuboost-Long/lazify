import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

import { FileSlice } from "./cache";
import { RawRateWindow, toRateLimit } from "./reported";
import { record } from "./totals";

export function listFiles(root: string, depth: number): string[] {
	let entries: fs.Dirent[];

	try {
		entries = fs.readdirSync(root, { withFileTypes: true });
	} catch {
		return [];
	}

	return entries.flatMap((entry) => {
		const full = path.join(root, entry.name);

		if (entry.isDirectory()) return depth > 0 ? listFiles(full, depth - 1) : [];

		return entry.isFile() && entry.name.endsWith(".jsonl") ? [full] : [];
	});
}

/** Streams the bytes after `start`, handing each line to the parser. */

/** Streams the bytes after `start`, handing each line to the parser. */
export async function readLines(
	filePath: string,
	start: number,
	onLine: (line: string) => void,
): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		const stream = fs.createReadStream(filePath, { start, encoding: "utf8" });
		const lines = readline.createInterface({
			input: stream,
			crlfDelay: Infinity,
		});

		lines.on("line", (line) => {
			if (line.length > 0) onLine(line);
		});
		lines.on("close", resolve);
		stream.on("error", reject);
	});
}

export function parseClaudeLine(line: string, slice: FileSlice): void {
	// Cheap reject before the JSON parse — most lines carry no usage at all.
	if (!line.includes('"usage"')) return;

	try {
		const entry = JSON.parse(line) as {
			type?: string;
			timestamp?: string;
			message?: {
				usage?: {
					input_tokens?: number;
					output_tokens?: number;
					cache_read_input_tokens?: number;
					cache_creation_input_tokens?: number;
				};
			};
		};

		const usage = entry.message?.usage;
		if (entry.type !== "assistant" || !usage || !entry.timestamp) return;
		if (slice.since && entry.timestamp < slice.since) return;

		const input = usage.input_tokens ?? 0;
		const output = usage.output_tokens ?? 0;
		const cacheRead = usage.cache_read_input_tokens ?? 0;
		const cacheWrite = usage.cache_creation_input_tokens ?? 0;

		record(slice, entry.timestamp, {
			input,
			output,
			cacheRead,
			cacheWrite,
			total: input + output + cacheRead + cacheWrite,
			messages: 1,
		});

		if (!slice.lastActivity || entry.timestamp > slice.lastActivity) {
			slice.lastActivity = entry.timestamp;
		}
	} catch {
		// Half-written trailing line; the next scan picks it up.
	}
}

export function parseCodexLine(line: string, slice: FileSlice): void {
	if (!line.includes('"token_count"')) return;

	try {
		const entry = JSON.parse(line) as {
			timestamp?: string;
			payload?: {
				type?: string;
				info?: {
					last_token_usage?: {
						input_tokens?: number;
						cached_input_tokens?: number;
						output_tokens?: number;
						total_tokens?: number;
					};
				};
				rate_limits?: {
					primary?: RawRateWindow | null;
					secondary?: RawRateWindow | null;
					plan_type?: string | null;
				} | null;
			};
		};

		if (entry.payload?.type !== "token_count" || !entry.timestamp) return;
		if (slice.since && entry.timestamp < slice.since) return;

		// Per-turn usage: summing these reproduces the session's cumulative total.
		const usage = entry.payload.info?.last_token_usage;

		if (usage) {
			const cacheRead = usage.cached_input_tokens ?? 0;
			// Codex counts cached tokens inside input_tokens; split them out.
			const input = Math.max((usage.input_tokens ?? 0) - cacheRead, 0);
			const output = usage.output_tokens ?? 0;

			record(slice, entry.timestamp, {
				input,
				output,
				cacheRead,
				cacheWrite: 0,
				total: usage.total_tokens ?? input + output + cacheRead,
				messages: 1,
			});
		}

		if (!slice.lastActivity || entry.timestamp > slice.lastActivity) {
			slice.lastActivity = entry.timestamp;
		}

		const limits = entry.payload.rate_limits;

		if (limits) {
			const limit = toRateLimit(
				[limits.primary, limits.secondary],
				limits.plan_type ?? null,
				entry.timestamp,
			);

			if (limit) slice.rateLimit = limit;
		}
	} catch {
		// Same as above: skip unparseable lines.
	}
}
