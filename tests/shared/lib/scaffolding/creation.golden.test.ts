import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

import { appFolders, nodeFolders } from "../../../platform/node-folders";
import { CREATION_CASES, execReply, registryReply, runCase } from "./creation.cases";
import type { CreationCase } from "./creation.cases";

let current: CreationCase;

vi.mock("@chain/sdk", () => ({
	desktop: {
		folders: nodeFolders,
		http: {
			get: async (url: string) => {
				const reply = registryReply(current, url);
				if (reply === "offline") throw Object.assign(new Error("network unreachable"), { code: "NETWORK" });
				return { ok: reply.status >= 200 && reply.status < 300, status: reply.status, headers: {}, data: reply.body };
			},
		},
	},
}));

vi.mock("@/platform/exec", () => ({
	environmentVariable: async () => os.homedir(),
	execFile: async (command: string, args: string[]) => {
		const reply = await execReply(current, command, args);
		if ("fail" in reply) throw Object.assign(new Error(reply.fail), { stdout: "", stderr: reply.stderr });
		return { stdout: reply.stdout, stderr: "" };
	},
}));

const { createProject } = await import("@/shared/lib/scaffolding/workflow/create");

const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "lazify-creation-")));
appFolders.temp = path.join(base, "app-temp");

afterAll(() => fs.rm(base, { recursive: true, force: true }));

describe("project creation golden", () => {
	CREATION_CASES.forEach((testCase, index) => {
		it(testCase.name, async () => {
			current = testCase;
			expect(
				await runCase(testCase, path.join(base, String(index)), path.join(appFolders.temp, "staging"), createProject as never),
			).toMatchSnapshot();
		});
	});
});
