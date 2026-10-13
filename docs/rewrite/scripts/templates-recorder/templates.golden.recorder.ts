import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterAll, describe, expect, it, vi } from "vitest";

import { execFor, runTemplatesCase, TEMPLATES_CASES } from "../../../../tests/shared/lib/scaffolding/templates.cases";

const electronRepo = path.resolve(__dirname, "../../../../../lazify");

const { base } = vi.hoisted(() => {
	const nodeFs = require("node:fs") as typeof import("node:fs");
	const nodeOs = require("node:os") as typeof import("node:os");
	const nodePath = require("node:path") as typeof import("node:path");
	return { base: nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "lazify-templates-"))) };
});

vi.mock("../../../../../lazify/node_modules/electron/index.js", () => {
	const app = { getPath: () => `${base}/data`, isPackaged: false, getAppPath: () => electronRepo };
	return { app, default: { app } };
});

vi.mock("node:child_process", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:child_process")>();
	const execFile = Object.assign(
		() => {
			throw new Error("callback form not used");
		},
		{
			[promisify.custom]: async (command: string, args: string[]) => {
				const reply = await execFor(command, args);
				if ("fail" in reply) throw Object.assign(new Error(reply.fail), { stdout: "", stderr: reply.stderr });
				return { stdout: reply.stdout, stderr: "" };
			},
		},
	);

	return { ...actual, default: { ...actual, execFile }, execFile };
});

const store = await import("../../../../../lazify/src/main/scaffolding/imported-template-store");
const { createProject } = await import("../../../../../lazify/src/main/scaffolding/workflow/create");

afterAll(() => fs.rmSync(base, { recursive: true, force: true }));

describe("imported templates golden", () => {
	for (const testCase of TEMPLATES_CASES) {
		it(testCase.name, async () => {
			const api = {
				save: store.saveImportedTemplateFromProject,
				list: store.listImportedTemplates,
				get: store.getImportedTemplate,
				update: store.updateImportedTemplate as never,
				remove: store.deleteImportedTemplate,
				createProject: createProject as never,
			};

			expect(await runTemplatesCase(testCase, api, { base, store: path.join(base, "data", "imported-templates") })).toMatchSnapshot();
		});
	}
});
