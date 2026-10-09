import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterAll, describe, expect, it, vi } from "vitest";

import {
	NPM_SCENARIOS,
	SEARCH_QUERIES,
	WORKFLOW_CASES,
	execReply,
	fakeRunner,
	registryReply,
	stable,
} from "../../../../tests/shared/lib/packages/packages.cases";

vi.mock("../../../../../lazify/node_modules/electron/index.js", () => {
	const app = { getPath: () => os.tmpdir(), isPackaged: false, getAppPath: () => os.tmpdir() };
	return { app, default: { app } };
});

vi.mock("node:child_process", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:child_process")>();
	const execFile = Object.assign(
		() => {
			throw new Error("callback form not used");
		},
		{
			[promisify.custom]: async (command: string, args: string[], options: { cwd?: string } = {}) => {
				const reply = execReply(command, args, options.cwd);
				if ("fail" in reply) throw Object.assign(new Error(reply.fail), { stdout: reply.stdout });
				return { stdout: reply.stdout, stderr: "" };
			},
		},
	);

	return { ...actual, default: { ...actual, execFile }, execFile };
});

vi.stubGlobal("fetch", async (url: URL | string) => {
	const reply = registryReply(String(url));
	if (reply === "offline") throw new TypeError("fetch failed");
	return { ok: reply.status >= 200 && reply.status < 300, status: reply.status, json: async () => reply.body };
});

const workflows = await import("../../../../../lazify/src/main/scaffolding/workflow/packages");
const { getNpmAudit, getNpmOutdated } = await import("../../../../../lazify/src/main/projects/project-health");
const { searchNpmPackages } = await import("../../../../../lazify/src/main/scaffolding/npm-registry");

const base = await fs.mkdtemp(path.join(os.tmpdir(), "lazify-packages-"));

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
