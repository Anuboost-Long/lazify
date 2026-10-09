import { listFolder, readFileSlice } from "@/platform/folders";

import type { FileSlice } from "./cache";
import { RawRateWindow, toRateLimit } from "./reported";
import { record } from "./totals";

const CHUNK_BYTES = 1024 * 1024;

export async function listFiles(root: string, depth: number): Promise<string[]> {
	let entries;

	try {
		entries = await listFolder(root);
	} catch {
		return [];
	}

	const nested = await Promise.all(
		entries.map(async (entry) => {
			if (entry.kind === "folder") return depth > 0 ? listFiles(entry.path, depth - 1) : [];

			return entry.kind === "file" && entry.name.endsWith(".jsonl") ? [entry.path] : [];
		}),
	);

	return nested.flat();
}

/** Streams the bytes after `start`, handing each line to the parser. */

/** Streams the bytes after `start`, handing each line to the parser. */
export async function readLines(
	filePath: string,
	start: number,
	onLine: (line: string) => void,
): Promise<void> {
	const decoder = new TextDecoder();
	let pending = "";

	for (let offset = start; ; offset += CHUNK_BYTES) {
		const chunk = await readFileSlice(filePath, offset, CHUNK_BYTES);
		if (chunk.length === 0) break;

		const lines = (pending + decoder.decode(chunk, { stream: true })).split(/\r\n|\n|\r/);
		pending = lines.pop() ?? "";

		for (const line of lines) {
			if (line.length > 0) onLine(line);
		}
	}

	pending += decoder.decode();
	if (pending.length > 0) onLine(pending);
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
