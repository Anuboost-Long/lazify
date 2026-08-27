export interface TokenTotals {
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
	total: number;
	/** Billed responses, i.e. assistant turns. */
	messages: number;
}

/** How long a metered window runs, named by what it means to the user. */

/** How long a metered window runs, named by what it means to the user. */
export type RateLimitWindowKind = "session" | "weekly" | "other";

export interface AgentRateLimitWindow {
	kind: RateLimitWindowKind;
	usedPercent: number;
	windowMinutes: number | null;
	resetsAt: string | null;
}

export interface AgentRateLimit {
	/** "reported" comes from the agent's own transcripts; "budget" is user-set. */
	source: "reported" | "budget";
	usedPercent: number;
	windowMinutes: number | null;
	resetsAt: string | null;
	planType: string | null;
	observedAt: string;
	/**
	 * Every window the account reported, shortest first, so the rolling block
	 * reads above the weekly allowance. An agent that meters two of them at once
	 * keeps both here, and one that meters a single window sends just the one.
	 */
	windows: AgentRateLimitWindow[];
	limitReached: boolean;
	/** Which window the account says is exhausted, when one is. */
	reachedType: string | null;
}

/** The rolling 5-hour block both CLIs meter against. */

/** The rolling 5-hour block both CLIs meter against. */
export interface AgentSessionWindow {
	/** "reported" is the account's own percentage; "derived" is read off transcripts. */
	source: "reported" | "derived";
	startsAt: string;
	resetsAt: string;
	hours: number;
	totals: TokenTotals;
	/** User-set token allowance for one block, when they set one. */
	budget: number | null;
	usedPercent: number | null;
	/** When a reported percentage was last refreshed by the agent CLI. */
	observedAt: string | null;
}

export interface AgentUsageSummary {
	agentId: string;
	label: string;
	/** False when the agent has no local transcripts to read. */
	hasData: boolean;
	session: TokenTotals;
	today: TokenTotals;
	week: TokenTotals;
	allTime: TokenTotals;
	/** Daily totals for the last 30 days, oldest first. */
	history: { date: string; total: number }[];
	lastActivity: string | null;
	rateLimit: AgentRateLimit | null;
	weeklyBudget: number | null;
	blockBudget: number | null;
	/** Null only when the agent has no transcripts at all to read a block from. */
	sessionWindow: AgentSessionWindow | null;
}

export interface AgentUsageReport {
	generatedAt: string;
	/** Start of the "session" window the totals were measured against. */
	since: string | null;
	agents: AgentUsageSummary[];
}

/** One working-tree file plus its line counts, used by the agent changes panel. */
