import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

import { nodeFolders } from "../../../platform/node-folders";
import {
	NPM_SCENARIOS,
	SEARCH_QUERIES,
	WORKFLOW_CASES,
	execReply,
	fakeRunner,
	registryReply,
	stable,
} from "./packages.cases";

vi.mock("@chain/sdk", () => ({
	desktop: {
		folders: nodeFolders,
		http: {
			get: async (url: string) => {
				const reply = registryReply(url);
				if (reply === "offline") throw Object.assign(new Error("network unreachable"), { code: "NETWORK" });
				return { ok: reply.status >= 200 && reply.status < 300, status: reply.status, headers: {}, data: reply.body };
			},
		},
	},
}));

vi.mock("@/platform/exec", () => ({
	currentOs: async () => "macos",
	environmentVariable: async () => os.homedir(),
	execFile: async (command: string, args: string[], options: { cwd?: string } = {}) => {
		const reply = execReply(command, args, options.cwd);
		if ("fail" in reply) throw Object.assign(new Error(reply.fail), { stdout: reply.stdout ?? "" });
		return { stdout: reply.stdout, stderr: "" };
	},
}));

const workflows = await import("@/shared/lib/scaffolding/workflow/packages");
const { getNpmAudit, getNpmOutdated } = await import("@/shared/lib/projects/project-health");
const { searchNpmPackages } = await import("@/shared/lib/scaffolding/npm-registry");

const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "lazify-packages-")));

afterAll(() => fs.rm(base, { recursive: true, force: true }));

describe("package workflows golden", () => {
	WORKFLOW_CASES.forEach((testCase, index) => {
		it(testCase.name, async () => {
			const project = path.join(base, String(index));
			if (!testCase.missing) {
				await fs.mkdir(project, { recursive: true });
				if (testCase.lock === "npm") await fs.writeFile(path.join(project, "package-lock.json"), "{}");
				if (testCase.lock === "yarn") await fs.writeFile(path.join(project, "yarn.lock"), "");
			}

			const { calls, runner } = fakeRunner(testCase.results);
			const progress: unknown[] = [];
			const ctx = { commandRunner: runner, emitProgress: (event: unknown) => progress.push(event) } as never;
			const { call } = testCase;

			let outcome: unknown;
			try {
				if (call.fn === "installProjectDependencies") outcome = await workflows.installProjectDependencies(ctx, project);
				else if (call.fn === "installPackage") {
					outcome = await workflows.installPackage(ctx, { ...call.payload, baseDirectory: base, projectName: String(index) });
				} else outcome = await workflows[call.fn](ctx, { ...call.payload, projectPath: project } as never);
			} catch (error) {
				outcome = { threw: (error as Error).message };
			}

			expect(stable({ calls, progress, outcome }, project)).toMatchSnapshot();
		});
	});
});

describe("project health golden", () => {
	NPM_SCENARIOS.forEach((scenario) => {
		it(scenario, async () => {
			const project = path.join(base, scenario);
			expect(stable({ outdated: await getNpmOutdated(project), audit: await getNpmAudit(project) }, project)).toMatchSnapshot();
		});
	});
});

describe("npm search golden", () => {
	SEARCH_QUERIES.forEach((query) => {
		it(JSON.stringify(query), async () => {
			const result = await searchNpmPackages(query).then(
				(packages) => ({ packages }),
				(error: Error) => ({ threw: error.message }),
			);
			expect(result).toMatchSnapshot();
		});
	});
});
