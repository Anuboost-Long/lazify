import fs from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

import { DEFINITION_CASES, runDefinitionCases, runHighlightingCase } from "../../../../tests/shared/lib/code-intelligence/definition.cases";

const { base } = vi.hoisted(() => {
	const nodeFs = require("node:fs") as typeof import("node:fs");
	const nodeOs = require("node:os") as typeof import("node:os");
	const nodePath = require("node:path") as typeof import("node:path");
	return { base: nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "lazify-definition-"))) };
});

vi.mock("../../../../../lazify/node_modules/electron/index.js", () => {
	const app = { getPath: () => `${base}/data` };
	const shell = { openPath: async () => "" };
	return { app, shell, default: { app, shell } };
});

const { findModuleDefinition, isModuleSpecifier } = await import("../../../../../lazify/src/main/code-intelligence/module-resolver");
const { findReferenceDefinition } = await import("../../../../../lazify/src/main/code-intelligence/reference-finder");
const { listHighlightingAssets } = await import("../../../../../lazify/src/main/code-intelligence/highlighting-store");

// The routing in Electron's `lazify:find-symbol-definition` handler.
const findSymbolDefinition = (
	projectPath: string,
	symbol: string,
	fromPath?: string | null,
	position?: { line: number; column: number } | null,
) =>
	isModuleSpecifier(symbol)
		? findModuleDefinition(projectPath, symbol, fromPath)
		: findReferenceDefinition(projectPath, symbol, fromPath, position);

afterAll(() => fs.rmSync(base, { recursive: true, force: true }));

const stable = (value: unknown) => JSON.parse(JSON.stringify(value ?? null).replaceAll(base, "<base>"));

describe("go to definition golden", () => {
	it(`answers ${DEFINITION_CASES.length} questions about one project`, async () => {
		expect(stable(await runDefinitionCases(findSymbolDefinition, path.join(base, "app")))).toMatchSnapshot();
	});

	it("lists the user's highlighting assets", async () => {
		expect(stable(await runHighlightingCase({ list: async () => listHighlightingAssets() }, path.join(base, "data", "highlighting")))).toMatchSnapshot();
	});
});
