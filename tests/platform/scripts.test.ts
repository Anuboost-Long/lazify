import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProjectTree } from "../shared/lib/stack-detection/stack-detection.cases";
import { memoryReader } from "../shared/lib/stack-detection/memory-reader";
import { createFakeTerminal } from "./fake-terminal";

let fake = createFakeTerminal();
let projects: Record<string, ProjectTree> = {};
let installed = new Set(["node", "npm", "yarn", "npx"]);
let busyPorts = new Set<number>();

vi.mock("@chain/sdk", () => ({
	desktop: {
		get terminal() {
			return fake.api;
		},
		ports: { isFree: async (port: number) => !busyPorts.has(port) },
		attention: { onNotificationClick: () => () => undefined },
	},
}));

vi.mock("@/platform/folders", () => ({
	projectReader: (root: string) => memoryReader(projects[root] ?? {}),
}));

vi.mock("@/platform/exec", () => ({
	currentOs: async () => "macos",
	execFile: async (command: string, args: string[]) => {
		if (args[0] === "--version") {
			if (!installed.has(command)) throw new Error(`${command}: not found`);
			return { stdout: `${command} 10.0.0\n`, stderr: "" };
		}
		if (command === "lsof") {
			return {
				stdout: "COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME\nnode 5002 dev 23u IPv4 0x1 0t0 TCP *:5173 (LISTEN)\npostgres 77 dev 5u IPv4 0x2 0t0 TCP 127.0.0.1:5432 (LISTEN)\n",
				stderr: "",
			};
		}
		if (command === "ps") return { stdout: "PID PPID\n1001 1\n5001 1001\n5002 5001\n77 1\n", stderr: "" };
		throw new Error(`unexpected ${command}`);
	},
}));

const npmApp = {
	"package.json": JSON.stringify({ scripts: { dev: "vite", build: "vite build" } }),
	"package-lock.json": "{}",
};

beforeEach(() => {
	fake = createFakeTerminal();
	projects = {
		"/work/web": npmApp,
		"/work/yarn": { "package.json": JSON.stringify({ scripts: { dev: "next dev" } }), "yarn.lock": "" },
		"/work/api": {
			"Api.csproj": '<Project Sdk="Microsoft.NET.Sdk.Web"></Project>',
			"Properties/launchSettings.json": "{}",
		},
		"/work/both": { ...npmApp, "Site.csproj": '<Project Sdk="Microsoft.NET.Sdk"></Project>' },
	};
	installed = new Set(["node", "npm", "yarn", "npx"]);
	busyPorts = new Set();
	vi.resetModules();
});

const loadScripts = () => import("@/platform/scripts");

describe("platform scripts", () => {
	it("lists package.json scripts and synthesised dotnet ones", async () => {
		const scripts = await loadScripts();

		await expect(scripts.listScripts("/work/web")).resolves.toEqual({ dev: "vite", build: "vite build" });
		await expect(scripts.listScripts("/work/api")).resolves.toMatchObject({
			"dotnet:run": "dotnet run --project Api.csproj",
			"dotnet:build": "dotnet build Api.csproj",
		});
		expect(Object.keys(await scripts.listScripts("/work/both"))).toEqual([
			"dev",
			"build",
			"dotnet:run",
			"dotnet:watch",
			"dotnet:build",
			"dotnet:restore",
			"dotnet:test",
			"dotnet:publish",
			"dotnet:clean",
		]);
		await expect(scripts.listScripts("/work/empty")).resolves.toEqual({});
	});

	it("runs a script with the project's package manager in a 220x50 terminal", async () => {
		const scripts = await loadScripts();

		await expect(scripts.runScript("/work/web", "dev")).resolves.toEqual({ runId: "pty-t1", ptyAvailable: true });
		await scripts.runScript("/work/yarn", "dev", 100, 30);

		expect(fake.sessions.get("t1")).toMatchObject({ command: "npm", args: ["run", "dev"], cwd: "/work/web", cols: 220, rows: 50 });
		expect(fake.sessions.get("t2")).toMatchObject({ command: "yarn", args: ["dev"], cwd: "/work/yarn", cols: 100, rows: 30 });
	});

	it("falls back to npm without a lock file, and to yarn when npm is missing", async () => {
		const scripts = await loadScripts();
		projects["/work/nolock"] = { "package.json": JSON.stringify({ scripts: { dev: "vite" } }) };

		await scripts.runScript("/work/nolock", "dev");
		installed.delete("npm");
		await scripts.runScript("/work/nolock", "dev");

		expect(fake.sessions.get("t1")?.command).toBe("npm");
		expect(fake.sessions.get("t2")?.command).toBe("yarn");
	});

	it("moves a dev server to the next free port when its own is taken", async () => {
		const scripts = await loadScripts();
		busyPorts = new Set([5173, 5174]);

		await scripts.runScript("/work/web", "dev");
		busyPorts = new Set([3000]);
		await scripts.runScript("/work/yarn", "dev");

		expect(fake.sessions.get("t1")).toMatchObject({ args: ["run", "dev", "--", "--port", "5175"] });
		expect(fake.sessions.get("t2")).toMatchObject({ args: ["dev", "--port", "3001"] });
	});

	it("leaves non-dev scripts and free ports alone", async () => {
		const scripts = await loadScripts();
		busyPorts = new Set([5173]);

		await scripts.runScript("/work/web", "build");
		busyPorts = new Set();
		await scripts.runScript("/work/web", "dev");

		expect(fake.sessions.get("t1")).toMatchObject({ args: ["run", "build"] });
		expect(fake.sessions.get("t2")).toMatchObject({ args: ["run", "dev"] });
	});

	it("says so when neither npm nor yarn is installed", async () => {
		const scripts = await loadScripts();
		installed = new Set(["node"]);

		await expect(scripts.runScript("/work/web", "dev")).rejects.toThrow(
			"No supported package manager was found. Install npm or yarn.",
		);
	});

	it("runs a dotnet script with the dotnet CLI", async () => {
		const scripts = await loadScripts();

		await scripts.runScript("/work/api", "dotnet:watch");

		expect(fake.sessions.get("t1")).toMatchObject({
			command: "dotnet",
			args: ["watch", "run", "--project", "Api.csproj"],
			metadata: { scriptName: "dotnet:watch", projectPath: "/work/api" },
		});
	});

	it("stops a script and announces the kill", async () => {
		const scripts = await loadScripts();
		const killed: unknown[] = [];
		scripts.onSessionKilled((event) => killed.push(event));
		const { runId } = await scripts.runScript("/work/web", "dev");

		await scripts.stopScript(runId);
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(killed).toEqual([{ runId }]);
		expect(fake.sessions.size).toBe(0);
	});

	it("restarts by stopping first, then launching a new run", async () => {
		const scripts = await loadScripts();
		const first = await scripts.runScript("/work/api", "dotnet:run");

		const second = await scripts.restartScript(first.runId, "/work/api", "dotnet:run");
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(second.runId).not.toBe(first.runId);
		expect([...fake.sessions.keys()]).toEqual(["t2"]);
	});

	it("lists sessions with the ports their process tree is listening on", async () => {
		const scripts = await loadScripts();
		const { runId } = await scripts.runScript("/work/web", "dev");

		await expect(scripts.listSessions()).resolves.toEqual([
			{
				runId,
				scriptName: "dev",
				projectPath: "/work/web",
				projectName: "web",
				pid: 1001,
				startedAt: "2026-10-09T12:00:01.000Z",
				ports: [{ port: 5173, command: "node", address: "*" }],
				waiting: false,
				isAgent: false,
			},
		]);
	});
});
