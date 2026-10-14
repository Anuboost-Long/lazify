import fs from "node:fs";
import { afterAll, describe, expect, it, vi } from "vitest";

import { ACTIVE_ENGINES, fakeLint, runProjectCases, runPureCases } from "../../../../tests/shared/lib/linting/linting.cases";

const { base } = vi.hoisted(() => {
	const nodeFs = require("node:fs") as typeof import("node:fs");
	const nodeOs = require("node:os") as typeof import("node:os");
	const nodePath = require("node:path") as typeof import("node:path");
	return { base: nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "lazify-linting-"))) };
});

vi.mock("../../../../../lazify/node_modules/electron/index.js", () => {
	const app = { getPath: () => `${base}/data` };
	return { app, default: { app } };
});

vi.mock("../../../../../lazify/src/main/linting/engines", async () => {
	const { projectRootFor } = await import("../../../../../lazify/src/main/linting/engines/project-root");
	return {
		projectRootFor,
		ENGINES: [{ source: "sonarlint", run: async ({ filePath, content }: { filePath: string; content: string }) => fakeLint(filePath, content) }],
	};
});

vi.mock("../../../../../lazify/src/main/extensions", () => ({
	PROVIDERS: [
		{ entry: { id: "SonarSource.sonarlint-vscode" }, diagnosticSource: "sonarlint" },
		{ entry: { id: "bradlc.vscode-tailwindcss" }, diagnosticSource: "tailwindcss" },
	],
	activeExtensionRoot: (id: string) =>
		(id === "SonarSource.sonarlint-vscode" ? ACTIVE_ENGINES.sonarlint : ACTIVE_ENGINES.tailwindcss) ? `/extensions/${id}` : null,
}));

const linting = await import("../../../../../lazify/src/main/linting");
const scan = await import("../../../../../lazify/src/main/linting/scan");

const api = {
	...linting,
	planFixPhases: scan.planFixPhases,
	commonFolder: scan.commonFolder,
	phaseOptions: scan.phaseOptions,
	collectScanFiles: scan.collectScanFiles,
	startSonarScan: linting.startSonarScan,
};

afterAll(() => fs.rmSync(base, { recursive: true, force: true }));

describe("linting golden", () => {
	it("writes the same texts and plans", () => {
		expect(runPureCases(api as never)).toMatchSnapshot();
	});

	it("reads, scans and reports the same projects", async () => {
		expect(await runProjectCases(api as never, base)).toMatchSnapshot();
	});
});
