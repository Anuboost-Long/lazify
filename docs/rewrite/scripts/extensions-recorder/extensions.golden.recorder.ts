import fs from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

import { EXTENSIONS_CASES, javaRuntime, openVsx, runExtensionsCase } from "../../../../tests/shared/lib/extensions/extensions.cases";

const { base } = vi.hoisted(() => {
	const nodeFs = require("node:fs") as typeof import("node:fs");
	const nodeOs = require("node:os") as typeof import("node:os");
	const nodePath = require("node:path") as typeof import("node:path");
	return { base: nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "lazify-extensions-"))) };
});

vi.mock("../../../../../lazify/node_modules/electron/index.js", () => {
	const app = { getPath: () => `${base}/data` };
	return { app, default: { app } };
});

vi.mock("../../../../../lazify/src/main/extensions/java-runtime", () => ({
	findJavaRuntime: () => javaRuntime(),
	forgetJavaRuntime: () => undefined,
}));

vi.stubGlobal("fetch", async (url: string) => {
	const reply = openVsx(String(url));
	return { ok: reply.status >= 200 && reply.status < 300, status: reply.status, json: async () => reply.body };
});

const extensions = await import("../../../../../lazify/src/main/extensions");

afterAll(() => fs.rmSync(base, { recursive: true, force: true }));

describe("extensions golden", () => {
	for (const testCase of EXTENSIONS_CASES) {
		it(testCase.name, async () => {
			const api = {
				list: extensions.listExtensions,
				beginInstall: extensions.beginInstall,
				jobs: extensions.installJobs,
				remove: extensions.removeExtension,
				toggle: extensions.toggleExtension,
				writeManifest: extensions.writeProjectExtensionManifest,
				refreshManifests: extensions.refreshWrittenManifests,
			};

			expect(await runExtensionsCase(testCase, api, { base, extensions: path.join(base, "data", "extensions") })).toMatchSnapshot();
		});
	}
});
