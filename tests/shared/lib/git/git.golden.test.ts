import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterAll, describe, expect, it, vi } from "vitest";

import { exercise, useGitEnv } from "./git.scenarios";

const nodeExecFile = promisify(execFile);

vi.mock("@/platform/exec", () => ({
	currentOs: async () => "macos",
	execFile: (command: string, args: string[], options: { cwd?: string; maxBuffer?: number } = {}) =>
		nodeExecFile(command, args, { ...options, encoding: "utf8" }),
}));

const appData = await fs.mkdtemp(path.join(os.tmpdir(), "lazify-app-data-"));
const session = new Map<string, string>();

vi.stubGlobal("sessionStorage", {
	getItem: (key: string) => session.get(key) ?? null,
	setItem: (key: string, value: string) => session.set(key, value),
});

afterAll(() => fs.rm(appData, { recursive: true, force: true }));

vi.mock("@/platform/folders", () => ({
	appDataPath: async () => appData,
	pathExists: async (target: string) => fs.access(target).then(() => true, () => false),
	createFolder: async (target: string) => {
		await fs.mkdir(target, { recursive: true });
	},
	writeTextFile: (target: string, text: string) => fs.writeFile(target, text),
	listFolderNames: (target: string) => fs.readdir(target).catch(() => []),
	deletePath: (target: string) => fs.rm(target, { recursive: true, force: true }),
	readSmallText: async (file: string, maxBytes: number) => {
		const stat = await fs.stat(file);
		if (!stat.isFile() || stat.size > maxBytes) throw new Error("TOO_LARGE");
		return fs.readFile(file, "utf8");
	},
}));

useGitEnv();

const api = {
	...(await import("@/shared/lib/git/project-git-status")),
	...(await import("@/shared/lib/git/git-actions")),
	...(await import("@/shared/lib/git/agent-changes")),
};

describe("git golden", () => {
	it("runs the same scenario on a real repository", async () => {
		const results = await exercise(api);
		for (const [name, value] of Object.entries(results)) {
			expect(value).toMatchSnapshot(name);
		}
	}, 30000);
});
