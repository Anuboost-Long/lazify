import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Diagnostic } from "../../../src/main/linting/types";

/**
 * The run itself is the language servers' work. What is worth holding still is
 * what the runner does around them: it says which engines were available, keeps
 * only the files that had something to say, and answers the panel it started in
 * even after it has stopped.
 */

const active = { sonarlint: true };

vi.mock("../../../src/main/extensions", () => ({
	PROVIDERS: [
		{ entry: { id: "SonarSource.sonarlint-vscode" }, diagnosticSource: "sonarlint" },
		{ entry: { id: "bradlc.vscode-tailwindcss" }, diagnosticSource: "tailwindcss" },
	],
	activeExtensionRoot: (id: string) =>
		id === "SonarSource.sonarlint-vscode" && active.sonarlint ? "/extensions/sonarlint" : null,
}));

const diagnostic: Diagnostic = {
	source: "sonarlint",
	rule: "sonarlint/S1854",
	code: "S1854",
	message: "Remove this useless assignment.",
	url: null,
	line: 2,
	column: 1,
	endLine: 2,
	endColumn: 8,
};

vi.mock("../../../src/main/linting/lint-file", () => ({
	lintFile: async (filePath: string) => ({
		path: filePath,
		diagnostics: filePath.endsWith("Loud.tsx") ? [diagnostic] : [],
	}),
}));

const { startSonarScan, stopSonarScan, sonarScanState } =
	await import("../../../src/main/linting/scan/scan-runner");

let projectPath = "";

const write = (relativePath: string) => {
	const filePath = path.join(projectPath, relativePath);

	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, "const value = 1;\nvalue = 2;\n");
};

beforeEach(() => {
	active.sonarlint = true;
	projectPath = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-scan-runner-"));
	fs.mkdirSync(path.join(projectPath, ".git"));
});

describe("startSonarScan", () => {
	it("reports the files that had findings, and says which engines ran", async () => {
		write("src/Loud.tsx");
		write("src/Quiet.tsx");

		const seen: string[] = [];
		const state = await startSonarScan(projectPath, (next) => seen.push(next.status));

		expect(state.status).toBe("done");
		expect(state.report?.engines).toEqual(["sonarlint"]);
		expect(state.report?.fileCount).toBe(2);
		expect(state.report?.files.map((file) => file.path)).toEqual(["src/Loud.tsx"]);
		expect(state.report?.files[0].findings[0].snippet).toContain("value = 2;");
		expect(seen.filter((status) => status === "running").length).toBeGreaterThan(0);
	});

	it("keeps the report where the panel can pick it up again", async () => {
		write("src/Loud.tsx");

		await startSonarScan(projectPath, () => undefined);

		expect(fs.existsSync(path.join(projectPath, ".lazify", "sonar-scan.json"))).toBe(true);
		expect(sonarScanState(projectPath).report?.findingCount).toBe(1);
	});

	it("says so rather than reporting a clean project when no engine is installed", async () => {
		active.sonarlint = false;
		write("src/Loud.tsx");

		const state = await startSonarScan(projectPath, () => undefined);

		expect(state.status).toBe("failed");
		expect(state.failure).toBe("no-engines");
	});

	it("fails on a project with nothing to read", async () => {
		const state = await startSonarScan(projectPath, () => undefined);

		expect(state.failure).toBe("no-files");
		expect(stopSonarScan(projectPath).status).toBe("failed");
	});
});
