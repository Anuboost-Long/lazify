import type {
	AgentRateLimit,
	AgentSessionWindow,
	AgentUsageSummary,
	TokenTotals,
} from "../../../renderer/shared/types/lazify";
import type { ClaudeUtilization } from "../claude-usage-api";
import { rateLimitWindow, toRateLimit as buildRateLimit } from "../rate-limit";
import { BLOCK_HOURS, currentBlock } from "./blocks";
import { FileSlice } from "./cache";
import { DAILY_HISTORY_DAYS, addTotals, emptyTotals } from "./totals";

/**
 * Prefers the account's own 5-hour percentage when one is current, keeping the
 * locally derived token counts alongside it; otherwise falls back to the block
 * walked out of the transcripts.
 */
function sessionWindowFor(
	hourly: Record<string, TokenTotals>,
	hourlyFirst: Record<string, string>,
	blockBudget: number | null,
	reported: ClaudeUtilization | null,
): AgentSessionWindow | null {
	const derived = currentBlock(hourly, hourlyFirst, blockBudget);
	const window = reported?.fiveHour;

	if (!window || typeof window.utilization !== "number") return derived;

	const resetsAt = window.resets_at ? new Date(window.resets_at).toISOString() : null;
	const resetsMs = resetsAt ? Date.parse(resetsAt) : 0;

	// The cached window has already expired, so its percentage says nothing about
	// the block running now — the transcripts are the better answer.
	if (resetsMs && resetsMs <= Date.now()) return derived;

	return {
		source: "reported",
		startsAt: resetsMs
			? new Date(resetsMs - BLOCK_HOURS * 3_600_000).toISOString()
			: (derived?.startsAt ?? new Date().toISOString()),
		resetsAt: resetsAt ?? derived?.resetsAt ?? new Date().toISOString(),
		hours: BLOCK_HOURS,
		totals: derived?.totals ?? emptyTotals(),
		budget: blockBudget,
		usedPercent: window.utilization,
		observedAt: reported.observedAt,
	};
}

export function summarize(
	agentId: string,
	label: string,
	slices: FileSlice[],
	sessionTotals: TokenTotals | null,
	weeklyBudget: number | null,
	blockBudget: number | null,
	reported: ClaudeUtilization | null = null,
	liveRateLimit: AgentRateLimit | null = null,
): AgentUsageSummary {
	const daily: Record<string, TokenTotals> = {};
	const hourly: Record<string, TokenTotals> = {};
	const hourlyFirst: Record<string, string> = {};
	let lastActivity: string | null = null;
	let rateLimit: AgentRateLimit | null = null;

	for (const slice of slices) {
		for (const [day, totals] of Object.entries(slice.daily)) {
			daily[day] ??= emptyTotals();
			addTotals(daily[day], totals);
		}

		for (const [hour, totals] of Object.entries(slice.hourly)) {
			hourly[hour] ??= emptyTotals();
			addTotals(hourly[hour], totals);
		}

		for (const [hour, first] of Object.entries(slice.hourlyFirst)) {
			if (!hourlyFirst[hour] || first < hourlyFirst[hour]) hourlyFirst[hour] = first;
		}

		if (slice.lastActivity && (!lastActivity || slice.lastActivity > lastActivity)) {
			lastActivity = slice.lastActivity;
		}

		// Keep the most recently observed limit snapshot.
		if (slice.rateLimit && (!rateLimit || slice.rateLimit.observedAt > rateLimit.observedAt)) {
			rateLimit = slice.rateLimit;
		}
	}

	const today = new Date().toISOString().slice(0, 10);
	const weekStart = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
	const historyStart = new Date(Date.now() - (DAILY_HISTORY_DAYS - 1) * 24 * 60 * 60 * 1000)
		.toISOString()
		.slice(0, 10);

	const allTime = emptyTotals();
	const week = emptyTotals();
	const history: { date: string; total: number }[] = [];

	for (const [day, totals] of Object.entries(daily)) {
		addTotals(allTime, totals);
		if (day >= weekStart) addTotals(week, totals);
		if (day >= historyStart) history.push({ date: day, total: totals.total });
	}

	history.sort((left, right) => left.date.localeCompare(right.date));

	// The account's own live window beats the snapshot left in the transcripts,
	// which is only as recent as the last time the agent happened to run.
	if (liveRateLimit) rateLimit = liveRateLimit;

	// A reported weekly window beats anything we could infer locally — unless it
	// has already reset, in which case its percentage is about a past week.
	const weeklyResetsMs = reported?.sevenDay?.resets_at ? Date.parse(reported.sevenDay.resets_at) : 0;
	const weeklyExpired = !!weeklyResetsMs && weeklyResetsMs <= Date.now();

	if (reported?.sevenDay && !weeklyExpired && typeof reported.sevenDay.utilization === "number") {
		rateLimit = buildRateLimit(
			[
				rateLimitWindow(
					reported.sevenDay.utilization,
					7 * 24 * 60,
					reported.sevenDay.resets_at ?? null,
				),
			],
			{ source: "reported", planType: null, observedAt: reported.observedAt },
		);
	}

	// No reported window? Fall back to the user's own weekly budget, if set.
	if (!rateLimit && weeklyBudget) {
		rateLimit = buildRateLimit(
			[rateLimitWindow(Math.min((week.total / weeklyBudget) * 100, 100), 7 * 24 * 60, null)],
			{ source: "budget", planType: null, observedAt: new Date().toISOString() },
		);
	}

	return {
		agentId,
		label,
		hasData: allTime.messages > 0,
		session: sessionTotals ?? emptyTotals(),
		today: daily[today] ?? emptyTotals(),
		week,
		allTime,
		history,
		lastActivity,
		rateLimit,
		weeklyBudget,
		blockBudget,
		sessionWindow: sessionWindowFor(hourly, hourlyFirst, blockBudget, reported),
	};
}

/**
 * @param sinceIso when set, each agent's `session` totals cover only usage
 * recorded at or after that moment — the app passes the time the agent tab was
 * opened.
 * @param agentIds when set, only these agents are scanned. Walking a
 * transcript tree and asking an account API both cost real time, so the app
 * passes the agents it actually has open; an empty list means "all of them".
 */
