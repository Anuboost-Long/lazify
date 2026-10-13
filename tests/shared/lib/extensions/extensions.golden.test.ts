import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

import { appFolders, nodeFolders } from "../../../platform/node-folders";
import { EXTENSIONS_CASES, javaRuntime, openVsx, runExtensionsCase } from "./extensions.cases";

vi.mock("@chain/sdk", () => ({ desktop: { folders: nodeFolders } }));

const passing = (test: (stats: { isFile(): boolean }) => boolean) => async (paths: string[]) => {
	const results = await Promise.all(paths.map((candidate) => fs.stat(candidate).then(test, () => false)));
	return new Set(paths.filter((_candidate, index) => results[index]));
};

vi.mock("@/platform/exec", () => ({
	existingFiles: passing((stats) => stats.isFile()),
	existingPaths: passing(() => true),
	pathExistsOnDisk: (target: string) => fs.stat(target).then(() => true, () => false),
}));

vi.mock("@/platform/http", () => ({
	getJson: async (url: string) => {
		const reply = openVsx(url);
		return { ok: reply.status >= 200 && reply.status < 300, status: reply.status, headers: {}, data: reply.body };
	},
}));

vi.mock("@/shared/lib/extensions/java-runtime", () => ({
	findJavaRuntime: async () => javaRuntime(),
	forgetJavaRuntime: () => undefined,
}));

const extensions = await import("@/shared/lib/extensions");

const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "lazify-extensions-")));
appFolders.data = path.join(base, "data");

afterAll(() => fs.rm(base, { recursive: true, force: true }));

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

			expect(await runExtensionsCase(testCase, api, { base, extensions: path.join(appFolders.data, "extensions") })).toMatchSnapshot();
		});
	}
});
