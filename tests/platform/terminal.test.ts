import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ScriptStatusEvent } from "@/shared/types/sessions";

import { createFakeTerminal } from "./fake-terminal";

let fake = createFakeTerminal();

vi.mock("@chain/sdk", () => ({
	desktop: {
		get terminal() {
			return fake.api;
		},
	},
}));

const loadPage = () => import("@/platform/terminal");

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

async function reload() {
	fake.reloadPage();
	vi.resetModules();

	return loadPage();
}

beforeEach(() => {
	fake = createFakeTerminal();
	vi.resetModules();
});

const project = { command: "npm", args: ["run", "dev"], cwd: "/Users/dev/shop", scriptName: "dev" };

describe("platform terminal", () => {
	it("starts a session the way Electron's pty runner did", async () => {
		const terminal = await loadPage();
		const statuses: ScriptStatusEvent[] = [];
		terminal.onScriptStatus((event) => statuses.push(event));

		const runId = await terminal.startPty(project);

		expect(runId).toBe("pty-t1");
		expect(statuses).toEqual([{ runId, scriptName: "dev", status: "running", exitCode: null }]);
		expect(fake.sessions.get("t1")).toMatchObject({
			command: "npm",
			args: ["run", "dev"],
			cwd: "/Users/dev/shop",
			cols: 220,
			rows: 50,
			label: "dev",
			metadata: { scriptName: "dev", projectPath: "/Users/dev/shop" },
		});
	});

	it("passes output on with its run id and sequence number", async () => {
		const terminal = await loadPage();
		const runId = await terminal.startPty(project);
		const chunks: unknown[] = [];
		terminal.onPtyData((event) => chunks.push(event));

		fake.print("t1", "ready\r\n");

		expect(chunks).toEqual([{ runId, data: "ready\r\n", seq: 1 }]);
	});

	it("lists running sessions with Electron's session info", async () => {
		const terminal = await loadPage();
		const runId = await terminal.startPty(project);

		await expect(terminal.listPtySessions()).resolves.toEqual([
			{
				runId,
				scriptName: "dev",
				projectPath: "/Users/dev/shop",
				projectName: "shop",
				pid: 1001,
				startedAt: "2026-10-09T12:00:01.000Z",
			},
		]);
	});

	it("reports an exit and then forgets the session, as Electron did", async () => {
		const terminal = await loadPage();
		const statuses: ScriptStatusEvent[] = [];
		terminal.onScriptStatus((event) => statuses.push(event));
		const ok = await terminal.startPty(project);
		const failing = await terminal.startPty({ ...project, scriptName: "test" });

		fake.exit("t1", { code: 0, killed: false });
		fake.exit("t2", { code: 1, killed: false });
		await settle();

		expect(statuses.slice(2)).toEqual([
			{ runId: ok, scriptName: "dev", status: "done", exitCode: 0 },
			{ runId: failing, scriptName: "test", status: "error", exitCode: 1 },
		]);
		expect(fake.sessions.size).toBe(0);
		await expect(terminal.ptyBacklog(ok)).resolves.toEqual({ data: "", seq: 0 });
	});

	it("survives a page reload: the session keeps running and its backlog comes back", async () => {
		const before = await loadPage();
		const runId = await before.startPty(project);
		fake.print("t1", "compiling\r\n");

		const after = await reload();
		fake.print("t1", "ready on :5173\r\n");

		await expect(after.listPtySessions()).resolves.toMatchObject([{ runId, scriptName: "dev" }]);
		await expect(after.ptyBacklog(runId)).resolves.toEqual({ data: "compiling\r\nready on :5173\r\n", seq: 2 });

		const live: unknown[] = [];
		after.onPtyData((event) => live.push(event));
		fake.print("t1", "GET /\r\n");
		expect(live).toEqual([{ runId, data: "GET /\r\n", seq: 3 }]);
	});

	it("forgets sessions that exited while the page was reloading", async () => {
		const before = await loadPage();
		await before.startPty(project);
		const still = await before.startPty({ ...project, scriptName: "watch" });

		fake.reloadPage();
		fake.exit("t1", { code: 0, killed: false });
		const after = await reload();

		await expect(after.listPtySessions()).resolves.toMatchObject([{ runId: still }]);
		expect([...fake.sessions.keys()]).toEqual(["t2"]);
	});

	it("sends input and resizes, and ignores sessions that are gone", async () => {
		const terminal = await loadPage();
		const runId = await terminal.startPty(project);

		terminal.ptyWrite(runId, "q");
		terminal.ptyResize(runId, 120, 40);
		terminal.ptyWrite("pty-missing", "q");
		terminal.ptyResize("pty-missing", 1, 1);
		await settle();

		expect(fake.sessions.get("t1")).toMatchObject({ input: ["q"], cols: 120, rows: 40 });
	});

	it("stops a session and resolves even when it outlives the timeout", async () => {
		const terminal = await loadPage();
		const statuses: ScriptStatusEvent[] = [];
		terminal.onScriptStatus((event) => statuses.push(event));
		const runId = await terminal.startPty(project);

		await terminal.killPty(runId);
		await settle();
		expect(statuses.at(-1)).toEqual({ runId, scriptName: "dev", status: "error", exitCode: null });
		expect(fake.sessions.size).toBe(0);

		const stubborn = await terminal.startPty(project);
		fake.makeKillTimeOut();
		await expect(terminal.killPty(stubborn)).resolves.toBeUndefined();
	});
});
