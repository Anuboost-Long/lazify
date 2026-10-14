import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

import { nodeFolders } from "../../../platform/node-folders";
import { ACTIVE_ENGINES, fakeLint, runProjectCases, runPureCases } from "./linting.cases";

vi.mock("@chain/sdk", () => ({ desktop: { folders: nodeFolders } }));
vi.mock("@/platform/exec", () => import("../../../platform/node-exec"));

vi.mock("@/shared/lib/linting/engines", async () => {
	const { projectRootFor } = await import("@/shared/lib/linting/engines/project-root");
	return {
		projectRootFor,
		ENGINES: [{ source: "sonarlint", run: async ({ filePath, content }: { filePath: string; content: string }) => fakeLint(filePath, content) }],
	};
});

vi.mock("@/shared/lib/extensions", () => ({
	PROVIDERS: [
		{ entry: { id: "SonarSource.sonarlint-vscode" }, diagnosticSource: "sonarlint" },
		{ entry: { id: "bradlc.vscode-tailwindcss" }, diagnosticSource: "tailwindcss" },
	],
	activeExtensionRoot: async (id: string) =>
		(id === "SonarSource.sonarlint-vscode" ? ACTIVE_ENGINES.sonarlint : ACTIVE_ENGINES.tailwindcss) ? `/extensions/${id}` : null,
}));

const linting = await import("@/shared/lib/linting");
const scan = await import("@/shared/lib/linting/scan");

const api = {
	...linting,
	planFixPhases: scan.planFixPhases,
	commonFolder: scan.commonFolder,
	phaseOptions: scan.phaseOptions,
	collectScanFiles: scan.collectScanFiles,
};

const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "lazify-linting-")));

afterAll(() => fs.rm(base, { recursive: true, force: true }));

describe("linting golden", () => {
	it("writes the same texts and plans", () => {
		expect(runPureCases(api as never)).toMatchSnapshot();
	});

	it("reads, scans and reports the same projects", async () => {
		expect(await runProjectCases(api as never, base)).toMatchSnapshot();
	});
});
