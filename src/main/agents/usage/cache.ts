import fs from "node:fs";
import path from "node:path";

import { app } from "electron";

import type { AgentRateLimit, TokenTotals } from "../../../renderer/shared/types/lazify";

/** Bumped whenever a cached slice's shape changes, which invalidates the file. */
const CACHE_VERSION = 3;

export interface FileSlice {
	size: number;
	mtimeMs: number;
	/** Bytes already folded into `daily`; the tail after it is what we re-read. */
	offset: number;
	daily: Record<string, TokenTotals>;
	/** Keyed "YYYY-MM-DDTHH" (UTC), pruned to the last few days. */
	hourly: Record<string, TokenTotals>;
	/** Earliest timestamp seen in each of those hours, so blocks start exactly. */
	hourlyFirst: Record<string, string>;
	lastActivity: string | null;
	rateLimit: AgentRateLimit | null;
	/** Set for session scans: entries older than this are ignored. */
	since?: string;
}

interface UsageCache {
	version?: number;
	agents: Record<string, Record<string, FileSlice>>;
}

export let cache: UsageCache | null = null;

function cachePath(): string {
	return path.join(app.getPath("userData"), "agent-usage-cache.json");
}

export function readCache(): UsageCache {
	if (cache) return cache;

	try {
		const parsed = JSON.parse(fs.readFileSync(cachePath(), "utf8")) as UsageCache;
		cache = parsed.version === CACHE_VERSION ? parsed : { version: CACHE_VERSION, agents: {} };
	} catch {
		cache = { version: CACHE_VERSION, agents: {} };
	}

	return cache;
}

export function writeCache(): void {
	if (!cache) return;

	try {
		fs.mkdirSync(path.dirname(cachePath()), { recursive: true });
		fs.writeFileSync(cachePath(), JSON.stringify(cache), "utf8");
	} catch {
		// A missing cache only costs a slower next scan.
	}
}
