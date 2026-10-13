import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

import { appFolders, nodeFolders } from "../../../platform/node-folders";
import { execFor, runTemplatesCase, TEMPLATES_CASES } from "./templates.cases";

vi.mock("@chain/sdk", () => ({ desktop: { folders: nodeFolders } }));

vi.mock("@/platform/exec", () => ({
	environmentVariable: async () => os.homedir(),
	execFile: async (command: string, args: string[]) => {
		const reply = await execFor(command, args);
		if ("fail" in reply) throw Object.assign(new Error(reply.fail), { stdout: "", stderr: reply.stderr });
		return { stdout: reply.stdout, stderr: "" };
	},
}));

const store = await import("@/shared/lib/scaffolding/imported-template-store");
const { createProject } = await import("@/shared/lib/scaffolding/workflow/create");

const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "lazify-templates-")));
appFolders.data = path.join(base, "data");

afterAll(() => fs.rm(base, { recursive: true, force: true }));

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

			expect(
				await runTemplatesCase(testCase, api, { base, store: path.join(appFolders.data, "imported-templates") }),
			).toMatchSnapshot();
		});
	}
});
