import type { AgentUsageReport } from "../../renderer/shared/types/lazify";
import { listAgentBudgets } from "./agent-limits-store";
import { getClaudeUtilization } from "./claude-usage-api";
import { getCodexRateLimit } from "./codex-usage-api";
import { listCustomAgents } from "./custom-agents-store";
import { FileSlice, writeCache } from "./usage/cache";
import { claudeFiles, codexFiles, scanAgent, scanSince } from "./usage/scan";
import { summarize } from "./usage/summarize";
import { parseClaudeLine, parseCodexLine } from "./usage/transcripts";

/**
 * Token usage read straight from the agent CLIs' own local transcripts:
 *   Claude Code — ~/.claude/projects/<slug>/<session>.jsonl, one line per
 *     message, assistant lines carrying `message.usage`.
 *   Codex — ~/.codex/sessions/<y>/<m>/<d>/rollout-*.jsonl, whose `token_count`
 *     events carry both per-turn usage and the account's rate-limit window.
 *
 * Transcripts run to hundreds of megabytes, so files are parsed once and their
 * daily totals cached by size/mtime; only the appended tail of a growing file
 * is re-read on later scans.
 */

/**
 * @param sinceIso when set, each agent's `session` totals cover only usage
 * recorded at or after that moment — the app passes the time the agent tab was
 * opened.
 * @param agentIds when set, only these agents are scanned. Walking a
 * transcript tree and asking an account API both cost real time, so the app
 * passes the agents it actually has open; an empty list means "all of them".
 */
export async function getAgentUsage(
	sinceIso?: string,
	agentIds?: string[],
): Promise<AgentUsageReport> {
	const wanted = agentIds && agentIds.length > 0 ? new Set(agentIds) : null;
	const includes = (agentId: string) => !wanted || wanted.has(agentId);

	const claudePaths = includes("claude") ? claudeFiles() : [];
	const codexPaths = includes("codex") ? codexFiles() : [];

	// Skipped agents are skipped entirely: scanning them with no files would
	// prune their cached slices and make the next scan a full re-read.
	const [claudeSlices, codexSlices] = await Promise.all([
		includes("claude")
			? scanAgent("claude", claudePaths, parseClaudeLine)
			: Promise.resolve<FileSlice[]>([]),
		includes("codex")
			? scanAgent("codex", codexPaths, parseCodexLine)
			: Promise.resolve<FileSlice[]>([]),
	]);

	const [claudeSession, codexSession] = sinceIso
		? await Promise.all([
				scanSince(claudePaths, sinceIso, parseClaudeLine),
				scanSince(codexPaths, sinceIso, parseCodexLine),
			])
		: [null, null];

	writeCache();

	const budgets = listAgentBudgets();
	// Both accounts are asked once per refresh, together, and neither call
	// outlives it.
	const [claudeUtilization, codexRateLimit] = await Promise.all([
		includes("claude") ? getClaudeUtilization() : null,
		includes("codex") ? getCodexRateLimit() : null,
	]);

	// Custom agents are arbitrary commands, so nothing local reports their usage.
	const customs = listCustomAgents()
		.filter(({ id }) => includes(id))
		.map(({ id, label }) =>
			summarize({
				agentId: id,
				label,
				slices: [],
				sessionTotals: null,
				weeklyBudget: budgets[id] ?? null,
				blockBudget: budgets[`${id}#5h`] ?? null,
			}),
		);

	return {
		generatedAt: new Date().toISOString(),
		since: sinceIso ?? null,
		agents: [
			...(includes("claude")
				? [
						summarize({
							agentId: "claude",
							label: "Claude",
							slices: claudeSlices,
							sessionTotals: claudeSession,
							weeklyBudget: budgets.claude ?? null,
							blockBudget: budgets["claude#5h"] ?? null,
							reported: claudeUtilization,
						}),
					]
				: []),
			...(includes("codex")
				? [
						summarize({
							agentId: "codex",
							label: "Codex",
							slices: codexSlices,
							sessionTotals: codexSession,
							weeklyBudget: budgets.codex ?? null,
							blockBudget: budgets["codex#5h"] ?? null,
							liveRateLimit: codexRateLimit,
						}),
					]
				: []),
			...customs,
		],
	};
}
