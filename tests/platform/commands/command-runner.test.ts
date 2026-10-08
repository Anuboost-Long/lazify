import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CommandChoicePrompt, LogEvent } from "@/platform/command-runner";

interface FakeProcess {
	command: string;
	args: string[];
	options: { cwd?: string; env?: Record<string, string>; keepStdinOpen?: boolean };
	output: (stream: "stdout" | "stderr", data: string) => void;
	exit: (code: number | null) => void;
	stdin: string[];
	killed: boolean;
}

let processes: FakeProcess[] = [];
let failStart: Error | null = null;
let outputBeforeHandle: string | null = null;
const installed = new Set(["node", "npm", "yarn", "npx", "git"]);

vi.mock("@/platform/exec", () => ({
	execFile: async (command: string) => {
		if (!installed.has(command)) throw new Error(`${command}: not found`);
		return { stdout: command === "node" ? "v22.1.0\n" : "1.0.0\n", stderr: "" };
	},
}));

vi.mock("@chain/sdk", () => ({
	desktop: {
		processRunner: {
			run: async (
				command: string,
				args: string[],
				onOutput: (chunk: { stream: "stdout" | "stderr"; data: string }) => void,
				options: FakeProcess["options"],
			) => {
				if (failStart) throw failStart;
				let resolveExit: (exit: { code: number | null; killed: boolean }) => void = () => undefined;
				const fake: FakeProcess = {
					command,
					args,
					options,
					output: (stream, data) => onOutput({ stream, data }),
					exit: (code) => resolveExit({ code, killed: fake.killed }),
					stdin: [],
					killed: false,
				};
				processes.push(fake);
				if (outputBeforeHandle) onOutput({ stream: "stdout", data: outputBeforeHandle });

				return {
					id: `p${processes.length}`,
					exited: new Promise((resolve) => {
						resolveExit = resolve;
					}),
					write: async (text: string) => {
						fake.stdin.push(text);
					},
					closeStdin: async () => undefined,
					kill: async () => {
						fake.killed = true;
						fake.exit(null);
					},
				};
			},
		},
	},
}));

const { CommandRunner } = await import("@/platform/command-runner");

const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

let logs: LogEvent[];
let prompts: CommandChoicePrompt[];
let runner: InstanceType<typeof CommandRunner>;

beforeEach(() => {
	processes = [];
	failStart = null;
	outputBeforeHandle = null;
	logs = [];
	prompts = [];
	runner = new CommandRunner(
		(event) => logs.push(event),
		(prompt) => prompts.push(prompt),
	);
});

const messages = () => logs.map((event) => [event.stream, event.message]);

describe("CommandRunner.runCommand", () => {
	it("streams output and resolves with the exit code", async () => {
		const result = runner.runCommand({ command: "git", args: ["status", "--short"], cwd: "/work/web" });
		await tick();

		processes[0].output("stdout", " M src/app.ts\n");
		processes[0].output("stderr", "warning: CRLF\n");
		processes[0].exit(0);

		await expect(result).resolves.toEqual({ success: true, exitCode: 0 });
		expect(processes[0]).toMatchObject({ command: "git", options: { cwd: "/work/web", keepStdinOpen: true } });
		expect(messages()).toEqual([
			["system", "> git status --short"],
			["stdout", " M src/app.ts\n"],
			["stderr", "warning: CRLF\n"],
			["system", "Command finished successfully."],
		]);
		expect(new Set(logs.map((event) => event.id)).size).toBe(1);
	});

	it("reports a failing exit on stderr", async () => {
		const result = runner.runCommand({ command: "git", args: ["push"] });
		await tick();
		processes[0].exit(128);

		await expect(result).resolves.toEqual({ success: false, exitCode: 128 });
		expect(messages().at(-1)).toEqual(["stderr", "Command exited with code 128."]);
	});

	it("rejects and logs when the program can't start", async () => {
		failStart = Object.assign(new Error("git: command not found"), { code: "NOT_FOUND" });

		await expect(runner.runCommand({ command: "git", args: ["status"] })).rejects.toThrow("git: command not found");
		expect(messages().at(-1)).toEqual(["stderr", "git: command not found"]);
	});

	it("refuses a package manager that isn't installed, as Electron did", async () => {
		installed.delete("yarn");

		await expect(runner.runCommand({ command: "yarn", args: ["install"] })).rejects.toThrow(
			"yarn is not installed or is not on PATH.",
		);
		installed.add("yarn");
	});

	it("turns a y/N question into a choice and answers it on stdin", async () => {
		const result = runner.runCommand({ command: "npm", args: ["init"] });
		await tick();
		processes[0].output("stdout", "Is this OK? (yes) ");
		processes[0].output("stdout", "\nOverwrite package.json? (y/N) ");
		await tick(60);

		expect(prompts).toEqual([
			{
				id: expect.stringMatching(/-prompt-0$/),
				commandId: logs[0].id,
				message: "Overwrite package.json?",
				options: [
					{ id: "yes", label: "Yes" },
					{ id: "no", label: "No" },
				],
			},
		]);

		expect(runner.chooseCommandOption(prompts[0].id, "yes")).toBe(true);
		await tick();
		expect(processes[0].stdin).toEqual(["y\n"]);
		expect(runner.chooseCommandOption(prompts[0].id, "no")).toBe(false);

		processes[0].exit(0);
		await result;
	});

	it("doesn't repeat a prompt it already showed", async () => {
		const result = runner.runCommand({ command: "npx", args: ["create-vite"] });
		await tick();
		processes[0].output("stdout", "Framework?\n1. React\n2. Vue\n");
		await tick(60);
		processes[0].output("stdout", "\r");
		await tick(60);

		expect(prompts).toHaveLength(1);
		expect(prompts[0].options).toEqual([
			{ id: "option-1", label: "React" },
			{ id: "option-2", label: "Vue" },
		]);

		processes[0].exit(0);
		await result;
	});

	it("still offers a prompt printed before the process handle arrived", async () => {
		outputBeforeHandle = "Continue? [Y/n]";
		const result = runner.runCommand({ command: "npx", args: ["expo", "install"] });
		await tick(100);

		expect(prompts).toHaveLength(1);
		expect(runner.chooseCommandOption(prompts[0].id, "no")).toBe(true);
		await tick();
		expect(processes[0].stdin).toEqual(["n\n"]);

		processes[0].exit(0);
		await result;
	});
});

describe("CommandRunner.startScript", () => {
	it("streams a script, reports its exit, and can stop it", async () => {
		const done: Array<[string, number | null]> = [];
		const scriptLogs: LogEvent[] = [];
		const runId = await runner.startScript(
			{ command: "npm", args: ["run", "build"], cwd: "/work/web", env: { CI: "1" } },
			(event) => scriptLogs.push(event),
			(id, code) => done.push([id, code]),
		);

		expect(runId).toMatch(/^script-\d+-[0-9a-f]{6}$/);
		expect(processes[0].options).toEqual({ cwd: "/work/web", env: { CI: "1" }, keepStdinOpen: true });

		processes[0].output("stdout", "built\n");
		processes[0].exit(0);
		await tick();

		expect(scriptLogs.map((event) => [event.stream, event.message])).toEqual([
			["system", "> npm run build"],
			["stdout", "built\n"],
			["system", "Process finished."],
		]);
		expect(done).toEqual([[runId, 0]]);
		expect(runner.stopScript(runId)).toBe(false);

		const second = await runner.startScript({ command: "npm", args: ["run", "dev"] }, () => undefined, () => undefined);
		expect(runner.stopScript(second)).toBe(true);
		expect(processes[1].killed).toBe(true);
	});

	it("reports a script that can't start as done with no exit code", async () => {
		failStart = new Error("npm: command not found");
		const done: Array<[string, number | null]> = [];
		const scriptLogs: LogEvent[] = [];

		const runId = await runner.startScript(
			{ command: "npm", args: ["run", "x"] },
			(event) => scriptLogs.push(event),
			(id, code) => done.push([id, code]),
		);

		expect(scriptLogs.at(-1)).toMatchObject({ stream: "stderr", message: "npm: command not found" });
		expect(done).toEqual([[runId, null]]);
	});
});
