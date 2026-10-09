import { appDataPath, readTextFile, writeTextFile } from "@/platform/folders";
import type { AgentRateLimit, TokenTotals } from "@/shared/types/agents";

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

let cache: UsageCache | null = null;

async function cachePath(): Promise<string> {
	return `${await appDataPath()}/agent-usage-cache.json`;
}

export async function readCache(): Promise<UsageCache> {
	if (cache) return cache;

	try {
		const parsed = JSON.parse((await readTextFile(await cachePath())) ?? "") as UsageCache;
		cache = parsed.version === CACHE_VERSION ? parsed : { version: CACHE_VERSION, agents: {} };
	} catch {
		cache = { version: CACHE_VERSION, agents: {} };
	}

	return cache;
}

export async function writeCache(): Promise<void> {
	if (!cache) return;

	try {
		await writeTextFile(await cachePath(), JSON.stringify(cache));
	} catch {
		// A missing cache only costs a slower next scan.
	}
}
