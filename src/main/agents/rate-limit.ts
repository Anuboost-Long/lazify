import type {
	AgentRateLimit,
	AgentRateLimitWindow,
	RateLimitWindowKind,
} from "../../renderer/shared/types/lazify";

const SESSION_MAX_MINUTES = 24 * 60;

export function windowKind(windowMinutes: number | null): RateLimitWindowKind {
	if (windowMinutes === null) return "other";

	return windowMinutes <= SESSION_MAX_MINUTES ? "session" : "weekly";
}

export function rateLimitWindow(
	usedPercent: number | null | undefined,
	windowMinutes: number | null,
	resetsAt: string | null,
): AgentRateLimitWindow | null {
	if (typeof usedPercent !== "number") return null;

	return { kind: windowKind(windowMinutes), usedPercent, windowMinutes, resetsAt };
}

interface RateLimitMeta {
	source: "reported" | "budget";
	planType: string | null;
	observedAt: string;
	limitReached?: boolean;
	reachedType?: string | null;
}

/**
 * The window closest to running out leads, because it is the one that will
 * actually stop the user; the rest travel with it so the reader can still see
 * what the account reported. Which windows arrive is the account's business —
 * an agent that stops metering one simply sends fewer.
 */
export function toRateLimit(
	windows: (AgentRateLimitWindow | null)[],
	meta: RateLimitMeta,
): AgentRateLimit | null {
	const present = windows.filter((window): window is AgentRateLimitWindow => window !== null);

	if (present.length === 0) return null;

	const ordered = [...present].sort((a, b) => b.usedPercent - a.usedPercent);
	const binding = ordered[0];

	return {
		source: meta.source,
		usedPercent: binding.usedPercent,
		windowMinutes: binding.windowMinutes,
		resetsAt: binding.resetsAt,
		planType: meta.planType,
		observedAt: meta.observedAt,
		windows: ordered,
		limitReached: meta.limitReached ?? false,
		reachedType: meta.reachedType ?? null,
	};
}
