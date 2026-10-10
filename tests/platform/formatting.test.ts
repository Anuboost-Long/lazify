import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FormatterCall } from "@/shared/lib/formatting/worker-protocol";

let files: Record<string, string> = {};
let calls: Array<{ command: string; args: string[]; cwd?: string }> = [];
let respond: (call: FormatterCall) => Promise<{ stdout: string; stderr: string }>;
let changes: string[] = [];

vi.mock("../../node/formatter/dist/formatter.mjs?raw", () => ({ default: "// bundled formatter" }));

vi.mock("@/platform/folders", () => ({
	appDataPath: async () => "/app",
	createFolder: async () => undefined,
	deletePath: async (path: string) => {
		delete files[path];
	},
	listFolderNames: async (folder: string) =>
		Object.keys(files)
			.filter((path) => path.startsWith(`${folder}/`))
			.map((path) => path.slice(folder.length + 1)),
	pathExists: async (path: string) => path in files,
	readTextFile: async (path: string) => files[path] ?? null,
	writeTextFile: async (path: string, text: string) => {
		files[path] = text;
	},
}));

vi.mock("@/platform/exec", () => ({
	execFile: (command: string, args: string[], options: { cwd?: string } = {}) => {
		calls.push({ command, args, cwd: options.cwd });
		return respond(JSON.parse(args[1]) as FormatterCall);
	},
}));

vi.mock("@/shared/lib/git/agent-changes", () => ({
	getWorkingChanges: async () => changes.map((path) => ({ path })),
}));

const answer = (value: unknown) => Promise.resolve({ stdout: JSON.stringify(value), stderr: "" });
const outcome = (formatted: string[]) => ({ formatted, unchanged: [], failed: [], configFile: null });

beforeEach(() => {
	files = {};
	calls = [];
	changes = [];
	respond = () => answer(outcome([]));
	vi.resetModules();
});

describe("formatter settings", () => {
	it("start manual, and persist in Electron's file and shape", async () => {
		const formatting = await import("@/platform/formatting");

		expect((await formatting.formatterSettings()).mode).toBe("manual");

		await formatting.setFormatterMode("auto");
		await formatting.setFormatterDefaults({ printWidth: 80, trailingComma: "bogus" as never });

		expect(JSON.parse(files["/app/code-formatter.json"])).toEqual({
			mode: "auto",
			organizeImports: true,
			defaults: expect.objectContaining({ printWidth: 80, trailingComma: "none" }),
		});
	});
});

describe("formatting a project", () => {
	it("runs the bundled formatter under node, from the app's folder, installed once", async () => {
		const formatting = await import("@/platform/formatting");

		await formatting.formatChangedFiles("/p", ["a.ts"]);
		await formatting.formatChangedFiles("/p", ["b.ts"]);

		const installed = Object.keys(files).filter((path) => path.startsWith("/app/formatter/"));
		expect(installed).toHaveLength(1);
		expect(files[installed[0]]).toBe("// bundled formatter");
		expect(calls.map(({ command, args, cwd }) => [command, args[0], cwd])).toEqual([
			["node", installed[0], "/app"],
			["node", installed[0], "/app"],
		]);
	});

	it("replaces a formatter left by an earlier build", async () => {
		files["/app/formatter/formatter-old.mjs"] = "// earlier build";
		const formatting = await import("@/platform/formatting");

		await formatting.formatChangedFiles("/p", ["a.ts"]);

		expect(Object.keys(files).filter((path) => path.startsWith("/app/formatter/"))).toEqual([calls[0].args[0]]);
	});

	it("takes every changed file when none are named, with the saved settings", async () => {
		changes = ["src/a.ts", "README.md"];
		const formatting = await import("@/platform/formatting");
		await formatting.setOrganizeImports(false);

		let request: FormatterCall | null = null;
		respond = (call) => {
			request = call;
			return answer(outcome([]));
		};
		await formatting.formatChangedFiles("/p", undefined, "preview");

		expect(request).toEqual({
			command: "format",
			request: expect.objectContaining({ projectPath: "/p", paths: ["src/a.ts", "README.md"], mode: "preview", organizeImports: false }),
		});
	});

	it("names Node as what is missing, against every file it would have formatted", async () => {
		respond = () => Promise.reject(Object.assign(new Error("node not found"), { code: "NOT_FOUND" }));
		const formatting = await import("@/platform/formatting");

		const result = await formatting.formatChangedFiles("/p", ["a.ts", "b.ts"]);

		expect(result.formatted).toEqual([]);
		expect(result.failed).toEqual([
			{ path: "a.ts", message: "Formatting needs Node.js, which wasn't found. Install Node.js, then try again." },
			{ path: "b.ts", message: "Formatting needs Node.js, which wasn't found. Install Node.js, then try again." },
		]);
		expect(await formatting.projectFormatter("/p")).toEqual({ configFile: null });
		await expect(formatting.formatSample({} as never)).rejects.toThrow("needs Node.js");
	});
});

describe("formatting after an agent's turn", () => {
	it("does nothing in manual mode", async () => {
		changes = ["a.ts"];
		const formatting = await import("@/platform/formatting");
		const heard = vi.fn();
		formatting.onCodeFormatted(heard);

		await formatting.formatAfterTurn("/p");

		expect(calls).toEqual([]);
		expect(heard).not.toHaveBeenCalled();
	});

	it("formats in auto mode and reports only a pass that did something", async () => {
		changes = ["a.ts"];
		const formatting = await import("@/platform/formatting");
		await formatting.setFormatterMode("auto");
		const heard = vi.fn();
		const stop = formatting.onCodeFormatted(heard);

		await formatting.formatAfterTurn("/p");
		respond = () => answer(outcome(["a.ts"]));
		await formatting.formatAfterTurn("/p");
		stop();
		await formatting.formatAfterTurn("/p");

		expect(heard.mock.calls).toEqual([[{ projectPath: "/p", ...outcome(["a.ts"]) }]]);
	});
});
