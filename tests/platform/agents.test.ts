import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AgentAttentionEvent, AgentRunEvent } from "@/platform/agents";

import { createFakeTerminal } from "./fake-terminal";

const WORKING_FRAME = [
	"· Thinking… (12s · ↑ 1.2k tokens · esc to interrupt)",
	"",
	"╭──────────────────────────────────────╮",
	"│ >                                    │",
	"╰──────────────────────────────────────╯",
	"  ? for shortcuts",
].join("\n");

const IDLE_FRAME = [
	"✳ Cooked for 48s",
	"",
	"╭──────────────────────────────────────╮",
	"│ >                                    │",
	"╰──────────────────────────────────────╯",
	"  ? for shortcuts",
].join("\n");

const QUESTION = "Do you want to proceed?\n1. Yes\n2. No";

let fake = createFakeTerminal();
let files: Record<string, string> = {};
const onPath = new Set(["claude"]);

vi.mock("@chain/sdk", () => ({
	desktop: {
		get terminal() {
			return fake.api;
		},
	},
}));

vi.mock("@/platform/exec", () => ({
	currentOs: async () => "macos",
	environmentVariable: async (name: string) => ({ SHELL: "/bin/zsh", HOME: "/Users/dev" })[name] ?? null,
	pathExistsOnDisk: async () => false,
	execFile: async (command: string, args: string[]) => {
		if (command === "which" && onPath.has(args[0])) return { stdout: `/usr/local/bin/${args[0]}\n`, stderr: "" };
		if (command === "lsof" || command === "ps") return { stdout: "", stderr: "" };
		throw new Error(`${command} ${args.join(" ")} failed`);
	},
}));

vi.mock("@/platform/folders", () => ({
	appDataPath: async () => "/app",
	readTextFile: async (path: string) => files[path] ?? null,
	writeTextFile: async (path: string, text: string) => {
		files[path] = text;
	},
	projectReader: () => ({ exists: async () => false, list: async () => [], readText: async () => null }),
}));

const load = async () => ({ agents: await import("@/platform/agents"), scripts: await import("@/platform/scripts") });

beforeEach(() => {
	fake = createFakeTerminal();
	files = {};
	vi.resetModules();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("platform agents", () => {
	it("lists built-in agents by whether their CLI is installed, then custom ones", async () => {
		const { agents } = await load();
		await agents.addCustomAgent({ label: "  Aider Pro ", command: " aider --yes " });

		const listed = await agents.listAgents();

		expect(listed.map(({ id, available }) => [id, available])).toEqual([
			["claude", true],
			["codex", false],
			["gemini", false],
			["copilot", false],
			["cursor", false],
			["custom-aider-pro", true],
		]);
		expect(JSON.parse(files["/app/custom-agents.json"])).toEqual([
			{ id: "custom-aider-pro", label: "Aider Pro", command: "aider --yes" },
		]);
	});

	it("gives clashing custom agents distinct ids and removes them", async () => {
		const { agents } = await load();
		const first = await agents.addCustomAgent({ label: "Aider", command: "aider" });
		const second = await agents.addCustomAgent({ label: "aider!", command: "aider --model x" });

		expect([first.id, second.id]).toEqual(["custom-aider", "custom-aider-2"]);

		await agents.removeCustomAgent(first.id);
		expect((await agents.listAgents()).filter((agent) => agent.custom).map((agent) => agent.id)).toEqual([
			"custom-aider-2",
		]);
	});

	it("launches an agent from where its CLI lives, resuming when asked", async () => {
		const { agents } = await load();

		await expect(agents.openAgentTerminal("claude", "/work/web")).resolves.toEqual({ runId: "pty-t1" });
		await agents.openAgentTerminal("claude", "/work/web", 100, 40, "abc-123");
		await agents.openAgentTerminal("codex", "/work/web", undefined, undefined, "s-9");

		expect(fake.sessions.get("t1")).toMatchObject({
			command: "/usr/local/bin/claude",
			args: [],
			cwd: "/work/web",
			cols: 120,
			rows: 30,
			label: "Claude",
			metadata: { kind: "agent", agentId: "claude", hidden: "false" },
		});
		expect(fake.sessions.get("t2")).toMatchObject({ args: ["--resume", "abc-123"], cols: 100, rows: 40 });
		expect(fake.sessions.get("t3")).toMatchObject({ command: "codex", args: ["resume", "s-9"] });
	});

	it("runs a custom agent's command through the login shell", async () => {
		const { agents } = await load();
		const custom = await agents.addCustomAgent({ label: "Aider", command: "aider --yes" });

		await agents.openAgentTerminal(custom.id, "/work/web");

		expect(fake.sessions.get("t1")).toMatchObject({ command: "/bin/zsh", args: ["-lc", "aider --yes"] });
	});

	it("refuses an agent it doesn't know", async () => {
		const { agents } = await load();

		await expect(agents.openAgentTerminal("nope", "/work/web")).rejects.toThrow("Unknown agent: nope");
	});

	it("raises attention when the agent asks, and clears it when the user answers", async () => {
		const { agents, scripts } = await load();
		const events: AgentAttentionEvent[] = [];
		agents.onAgentAttention((event) => events.push(event));
		const { runId } = await agents.openAgentTerminal("claude", "/work/web");

		fake.print("t1", QUESTION);
		expect(events).toEqual([
			{ runId, projectPath: "/work/web", projectName: "web", agentLabel: "Claude", waiting: true, hold: null },
		]);
		expect(await agents.isWaiting(runId)).toBe(true);

		scripts.ptyWrite(runId, "1");
		expect(events).toHaveLength(1);
		scripts.ptyWrite(runId, "\r");
		expect(events.at(-1)).toMatchObject({ waiting: false });
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(fake.sessions.get("t1")?.input).toEqual(["1", "\r"]);
	});

	it("reports the end of a turn once", async () => {
		vi.useFakeTimers();
		const { agents } = await load();
		const done: AgentRunEvent[] = [];
		agents.onAgentDone((event) => done.push(event));
		const { runId } = await agents.openAgentTerminal("claude", "/work/web");

		fake.print("t1", WORKING_FRAME);
		vi.advanceTimersByTime(400);
		fake.print("t1", IDLE_FRAME);
		vi.advanceTimersByTime(30_000);

		expect(done).toEqual([{ runId, projectPath: "/work/web", projectName: "web", agentLabel: "Claude" }]);
	});

	it("marks agents in the session list and keeps hidden runs out of it", async () => {
		const { agents, scripts } = await load();
		const shown = await agents.openAgentTerminal("claude", "/work/web");
		await agents.openAgentTerminal("claude", "/work/web", 120, 30, undefined, true);
		fake.print("t1", QUESTION);

		const sessions = await scripts.listSessions();

		expect(sessions.map(({ runId, isAgent, waiting }) => ({ runId, isAgent, waiting }))).toEqual([
			{ runId: shown.runId, isAgent: true, waiting: true },
		]);
		expect(await agents.isHiddenRun("pty-t2")).toBe(true);
	});

	it("after a reload, finds agents again and reports one that is still waiting", async () => {
		const before = await load();
		const { runId } = await before.agents.openAgentTerminal("claude", "/work/web");
		await before.agents.openAgentTerminal("claude", "/work/api", 120, 30, undefined, true);
		fake.print("t1", `${WORKING_FRAME}\n${QUESTION}`);

		fake.reloadPage();
		vi.resetModules();
		vi.useFakeTimers();
		const after = await load();
		const events: AgentAttentionEvent[] = [];
		const done: AgentRunEvent[] = [];
		after.agents.onAgentAttention((event) => events.push(event));
		after.agents.onAgentDone((event) => done.push(event));
		await vi.advanceTimersByTimeAsync(0);

		expect(events).toEqual([
			{ runId, projectPath: "/work/web", projectName: "web", agentLabel: "Claude", waiting: true, hold: null },
		]);
		expect(await after.agents.isAgentRun(runId)).toBe(true);
		expect(await after.agents.isHiddenRun("pty-t2")).toBe(true);

		vi.advanceTimersByTime(60_000);
		expect(done).toEqual([]);
	});

	it("forgets an agent when its session ends", async () => {
		const { agents } = await load();
		const { runId } = await agents.openAgentTerminal("claude", "/work/web");

		fake.exit("t1", { code: 0, killed: false });
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(await agents.isAgentRun(runId)).toBe(false);
	});
});
