import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

import { appFolders, nodeFolders } from "../../../platform/node-folders";
import { DEFINITION_CASES, runDefinitionCases, runHighlightingCase } from "./definition.cases";

vi.mock("@chain/sdk", () => ({ desktop: { folders: nodeFolders } }));

vi.mock("@/platform/exec", () => ({
	existingFiles: async (paths: string[]) => {
		const files = await Promise.all(paths.map((candidate) => fs.stat(candidate).then((stats) => stats.isFile(), () => false)));
		return new Set(paths.filter((_candidate, index) => files[index]));
	},
	filesContaining: async (text: string, paths: string[]) => {
		const hits = await Promise.all(paths.map((candidate) => fs.readFile(candidate).then((bytes) => bytes.includes(text), () => false)));
		return new Set(paths.filter((_candidate, index) => hits[index]));
	},
}));

const { findSymbolDefinition, listHighlightingAssets } = await import("@/platform/code-intelligence");

const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "lazify-definition-")));
appFolders.data = path.join(base, "data");

afterAll(() => fs.rm(base, { recursive: true, force: true }));

const stable = (value: unknown) => JSON.parse(JSON.stringify(value ?? null).replaceAll(base, "<base>"));

describe("go to definition golden", () => {
	it(`answers ${DEFINITION_CASES.length} questions about one project`, async () => {
		expect(stable(await runDefinitionCases(findSymbolDefinition, path.join(base, "app")))).toMatchSnapshot();
	});

	it("lists the user's highlighting assets", async () => {
		expect(stable(await runHighlightingCase({ list: listHighlightingAssets }, path.join(appFolders.data, "highlighting")))).toMatchSnapshot();
	});
});
