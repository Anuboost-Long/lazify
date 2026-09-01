import type { AgentRateLimit } from "../../../renderer/shared/types/lazify";
import { rateLimitWindow, toRateLimit as buildRateLimit } from "../rate-limit";

export interface RawRateWindow {
	used_percent?: number | null;
	window_minutes?: number | null;
	resets_at?: number | null;
}

function resetsAtOf(window: RawRateWindow): string | null {
	return window.resets_at ? new Date(window.resets_at * 1000).toISOString() : null;
}

export function toRateLimit(
	windows: (RawRateWindow | null | undefined)[],
	planType: string | null,
	observedAt: string,
): AgentRateLimit | null {
	return buildRateLimit(
		windows.map((window) =>
			window
				? rateLimitWindow(window.used_percent, window.window_minutes ?? null, resetsAtOf(window))
				: null,
		),
		{ source: "reported", planType, observedAt },
	);
}

/** Re-reads only what changed, then returns every cached slice for the agent. */
