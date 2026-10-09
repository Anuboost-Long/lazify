import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { vi } from "vitest";

export interface UsageApi {
	getAgentUsage(sinceIso?: string, agentIds?: string[]): Promise<unknown>;
	setAgentBudget(agentId: string, weeklyTokens: number): unknown;
}

export interface FakeResponse {
	status: number;
	headers: Record<string, string>;
	body: unknown;
}

export const NOW = "2026-10-08T12:00:00.000Z";

export const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agent-usage-home-")));

const base64url = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const codexToken = `${base64url({ alg: "none" })}.${base64url({ exp: Date.parse("2030-01-01T00:00:00Z") / 1000 })}.sig`;

const network: Record<string, FakeResponse> = {
	"https://api.anthropic.com/api/oauth/usage": {
		status: 200,
		headers: { "content-type": "application/json" },
		body: {
			five_hour: { utilization: 42.5, resets_at: "2026-10-08T14:30:00Z" },
			seven_day: { utilization: 61, resets_at: "2026-10-12T00:00:00Z" },
		},
	},
	"https://chatgpt.com/backend-api/wham/usage": {
		status: 200,
		headers: { "content-type": "application/json" },
		body: {
			plan_type: "plus",
			rate_limit_reached_type: null,
			rate_limit: {
				limit_reached: false,
				primary_window: { used_percent: 17, limit_window_seconds: 18_000, reset_at: Date.parse("2026-10-08T15:00:00Z") / 1000 },
				secondary_window: { used_percent: 33, limit_window_seconds: 604_800, reset_at: Date.parse("2026-10-13T00:00:00Z") / 1000 },
			},
		},
	},
};

const fixtureTokens = new Set(["Bearer claude-token", `Bearer ${codexToken}`]);

export function respond(url: string, headers: Record<string, string>): FakeResponse {
	if (!fixtureTokens.has(headers.Authorization)) throw new Error(`Unexpected credentials for ${url}`);

	return network[url];
}

const jsonl = (...records: unknown[]) => `${records.map((record) => JSON.stringify(record)).join("\n")}\n`;

const assistant = (timestamp: string, usage: Record<string, number>) => ({
	type: "assistant",
	timestamp,
	message: { usage },
});

const tokenCount = (timestamp: string, usage: Record<string, number> | null, rateLimits: unknown = null) => ({
	timestamp,
	type: "event_msg",
	payload: { type: "token_count", info: usage ? { last_token_usage: usage } : null, rate_limits: rateLimits },
});

function write(file: string, body: string, mtime: string) {
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, body);
	const seconds = Date.parse(mtime) / 1000;
	fs.utimesSync(file, seconds, seconds);
}

export async function exercise(
	api: UsageApi,
	{ useUserData }: { useUserData(folder: string): void },
): Promise<Record<string, unknown>> {
	const userData = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agent-usage-data-")));
	const previousHome = process.env.HOME;
	const claudeWeb = path.join(home, ".claude", "projects", "-work-web", "s1.jsonl");
	const codexRollout = path.join(home, ".codex", "sessions", "2026", "10", "08", "rollout-a.jsonl");

	write(
		claudeWeb,
		jsonl(
			{ type: "user", timestamp: "2026-10-08T09:00:00.000Z", message: { content: "hi" } },
			assistant("2026-10-08T09:05:00.000Z", { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 1000, cache_creation_input_tokens: 200 }),
			assistant("2026-10-08T11:30:00.000Z", { input_tokens: 10, output_tokens: 5 }),
			assistant("2026-10-02T08:00:00.000Z", { input_tokens: 7, output_tokens: 3 }),
			{ type: "summary", usage: "not an assistant line" },
		) + '{"type":"assistant","timestamp":"2026-10-08T11:59:00.000Z","message":{"usage":{"input_tok',
		"2026-10-08T11:59:00.000Z",
	);
	write(
		path.join(home, ".claude", "projects", "-work-api", "nested", "s2.jsonl"),
		jsonl(assistant("2026-10-07T23:10:00.000Z", { input_tokens: 300, output_tokens: 120 })),
		"2026-10-07T23:10:00.000Z",
	);
	write(
		path.join(home, ".claude", "projects", "-work-api", "a", "b", "too-deep.jsonl"),
		jsonl(assistant("2026-10-08T10:00:00.000Z", { input_tokens: 9999, output_tokens: 9999 })),
		"2026-10-08T10:00:00.000Z",
	);
	write(
		codexRollout,
		jsonl(
			tokenCount("2026-10-08T10:00:00.000Z", { input_tokens: 500, cached_input_tokens: 200, output_tokens: 80, total_tokens: 580 }),
			tokenCount("2026-10-08T10:20:00.000Z", null, {
				primary: { used_percent: 12, window_minutes: 300, resets_at: Date.parse("2026-10-08T13:00:00Z") / 1000 },
				secondary: { used_percent: 30, window_minutes: 10_080, resets_at: Date.parse("2026-10-12T00:00:00Z") / 1000 },
				plan_type: "plus",
			}),
			{ timestamp: "2026-10-08T10:21:00.000Z", type: "event_msg", payload: { type: "agent_message" } },
		),
		"2026-10-08T10:21:00.000Z",
	);
	write(path.join(home, ".codex", "auth.json"), JSON.stringify({ tokens: { access_token: codexToken, account_id: "acct-1" } }), NOW);
	write(
		path.join(home, ".claude", ".credentials.json"),
		JSON.stringify({ claudeAiOauth: { accessToken: "claude-token", expiresAt: Date.parse("2030-01-01T00:00:00Z") } }),
		NOW,
	);
	fs.writeFileSync(
		path.join(userData, "custom-agents.json"),
		JSON.stringify([{ id: "custom-aider", label: "Aider", command: "aider" }]),
	);

	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date(NOW));

	try {
		process.env.HOME = home;
		useUserData(userData);

		await api.setAgentBudget("claude", 2_000_000.4);
		await api.setAgentBudget("claude#5h", 50_000);
		await api.setAgentBudget("custom-aider", 10_000);
		await api.setAgentBudget("custom-aider", 0);

		const results: Record<string, unknown> = {
			budgets: JSON.parse(fs.readFileSync(path.join(userData, "agent-token-budgets.json"), "utf8")),
			everything: await api.getAgentUsage(),
			sinceOpened: await api.getAgentUsage("2026-10-08T10:00:00.000Z", ["claude", "custom-aider"]),
		};

		fs.appendFileSync(claudeWeb, jsonl(assistant("2026-10-08T11:59:30.000Z", { input_tokens: 1, output_tokens: 1 })));
		const appended = Date.parse("2026-10-08T11:59:30.000Z") / 1000;
		fs.utimesSync(claudeWeb, appended, appended);
		results.afterAppend = await api.getAgentUsage(undefined, ["claude"]);

		return results;
	} finally {
		vi.useRealTimers();
		process.env.HOME = previousHome;
		fs.rmSync(home, { recursive: true, force: true });
		fs.rmSync(userData, { recursive: true, force: true });
	}
}
