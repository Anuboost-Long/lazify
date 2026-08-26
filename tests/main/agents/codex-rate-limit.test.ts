import { describe, expect, it } from "vitest";

import { rateLimitWindow, toRateLimit, windowKind } from "../../../src/main/agents/rate-limit";

const FIVE_HOURS = 18_000 / 60;
const ONE_WEEK = 604_800 / 60;

const minutesOf = (seconds: number | null) => (seconds ? Math.round(seconds / 60) : null);

describe("naming a metered window", () => {
	it("calls a rolling block a session window", () => {
		expect(windowKind(FIVE_HOURS)).toBe("session");
		expect(windowKind(60)).toBe("session");
	});

	it("calls anything longer than a day a weekly window", () => {
		expect(windowKind(ONE_WEEK)).toBe("weekly");
	});

	it("will not guess when the account gives no length", () => {
		expect(windowKind(null)).toBe("other");
	});
});

describe("both windows Codex reports", () => {
	// The live payload while the 5-hour limit is in force.
	const active = toRateLimit(
		[
			rateLimitWindow(19, minutesOf(18_000), "2026-08-26T04:42:58.000Z"),
			rateLimitWindow(3, minutesOf(604_800), "2026-09-01T04:42:58.000Z"),
		],
		{ source: "reported", planType: "plus", observedAt: "2026-08-26T00:00:00.000Z" },
	);

	it("keeps both rather than throwing one away", () => {
		expect(active?.windows.map((window) => window.kind)).toEqual(["session", "weekly"]);
	});

	it("leads with the window closest to running out", () => {
		expect(active?.usedPercent).toBe(19);
		expect(active?.windowMinutes).toBe(300);
		expect(active?.windows[0].kind).toBe("session");
	});

	it("carries the plan and the moment it was read", () => {
		expect(active?.planType).toBe("plus");
		expect(active?.observedAt).toBe("2026-08-26T00:00:00.000Z");
	});

	it("leads with the weekly window when that is the tighter one", () => {
		const weeklyBinds = toRateLimit(
			[rateLimitWindow(4, minutesOf(18_000), null), rateLimitWindow(88, minutesOf(604_800), null)],
			{ source: "reported", planType: "plus", observedAt: "2026-08-26T00:00:00.000Z" },
		);

		expect(weeklyBinds?.windows[0].kind).toBe("weekly");
		expect(weeklyBinds?.usedPercent).toBe(88);
	});
});

describe("when the rolling limit has been lifted", () => {
	it("reads a weekly-only report without complaint", () => {
		const lifted = toRateLimit([null, rateLimitWindow(3, minutesOf(604_800), null)], {
			source: "reported",
			planType: "plus",
			observedAt: "2026-08-26T00:00:00.000Z",
		});

		expect(lifted?.windows).toHaveLength(1);
		expect(lifted?.windows[0].kind).toBe("weekly");
		expect(lifted?.usedPercent).toBe(3);
	});

	it("reads a window whose percentage the account withheld as absent", () => {
		expect(rateLimitWindow(null, 300, null)).toBeNull();
		expect(rateLimitWindow(undefined, 300, null)).toBeNull();
	});

	it("has nothing to report when the account metered nothing at all", () => {
		expect(
			toRateLimit([null, null], {
				source: "reported",
				planType: null,
				observedAt: "2026-08-26T00:00:00.000Z",
			}),
		).toBeNull();
	});
});

describe("an exhausted account", () => {
	it("says the limit is reached rather than just showing nothing left", () => {
		const reached = toRateLimit([rateLimitWindow(100, minutesOf(18_000), null)], {
			source: "reported",
			planType: "plus",
			observedAt: "2026-08-26T00:00:00.000Z",
			limitReached: true,
			reachedType: "primary",
		});

		expect(reached?.limitReached).toBe(true);
		expect(reached?.reachedType).toBe("primary");
	});

	it("is not reached by default, so a quiet report never reads as exhausted", () => {
		const fine = toRateLimit([rateLimitWindow(19, minutesOf(18_000), null)], {
			source: "reported",
			planType: "plus",
			observedAt: "2026-08-26T00:00:00.000Z",
		});

		expect(fine?.limitReached).toBe(false);
		expect(fine?.reachedType).toBeNull();
	});
});
