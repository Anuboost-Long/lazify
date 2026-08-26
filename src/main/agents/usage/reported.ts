import type { AgentRateLimit } from "../../../renderer/shared/types/lazify";
import { rateLimitWindow, toRateLimit as buildRateLimit } from "../rate-limit";

export interface RawRateWindow {
	used_percent?: number | null;
	window_minutes?: number | null;
	resets_at?: number | null;
}

export function toRateLimit(
	window: RawRateWindow | null | undefined,
	planType: string | null,
	observedAt: string,
): AgentRateLimit | null {
	if (!window) return null;

	return buildRateLimit(
		[
			rateLimitWindow(
				window.used_percent,
				window.window_minutes ?? null,
				window.resets_at ? new Date(window.resets_at * 1000).toISOString() : null,
			),
		],
		{ source: "reported", planType, observedAt },
	);
}

/** Re-reads only what changed, then returns every cached slice for the agent. */
