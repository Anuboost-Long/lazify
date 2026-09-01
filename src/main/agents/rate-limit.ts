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

/**
 * A window only counts while it is actually metering. Codex turns its rolling
 * block on and off between plan changes, and it announces neither — when the
 * block is lifted the weekly simply arrives in the slot the block used to
 * occupy, so a window is read by the length it declares and dropped when that
 * length is missing or when the reading is about a window that has since reset.
 */
export function rateLimitWindow(
	usedPercent: number | null | undefined,
	windowMinutes: number | null,
	resetsAt: string | null,
): AgentRateLimitWindow | null {
	if (typeof usedPercent !== "number") return null;
	if (windowMinutes !== null && windowMinutes <= 0) return null;

	const resetsMs = resetsAt ? Date.parse(resetsAt) : Number.NaN;
	if (Number.isFinite(resetsMs) && resetsMs <= Date.now()) return null;

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
 * Windows are ordered by how long they run, shortest first, so a reading keeps
 * its place from one refresh to the next — the rolling block above the weekly
 * allowance, whatever each is doing. The scalars beside them describe the
 * window closest to running out, because that is the one that will actually
 * stop the user. Which windows arrive is the account's business — an agent that
 * stops metering one simply sends fewer.
 */
export function toRateLimit(
	windows: (AgentRateLimitWindow | null)[],
	meta: RateLimitMeta,
): AgentRateLimit | null {
	const present = windows.filter((window): window is AgentRateLimitWindow => window !== null);

	if (present.length === 0) return null;

	const ordered = [...present].sort(
		(a, b) =>
			(a.windowMinutes ?? Number.POSITIVE_INFINITY) - (b.windowMinutes ?? Number.POSITIVE_INFINITY),
	);
	const binding = present.reduce(
		(tightest, window) => (window.usedPercent > tightest.usedPercent ? window : tightest),
		present[0],
	);

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
