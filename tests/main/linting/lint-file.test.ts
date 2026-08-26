import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Diagnostic } from "../../../src/main/linting/types";

const runs: { source: string; projectPath: string | null }[] = [];

let sonarlintResult: () => Promise<{ diagnostics: Diagnostic[] } | null>;
let tailwindResult: () => Promise<{ diagnostics: Diagnostic[] } | null>;

vi.mock("../../../src/main/linting/engines", async () => {
	const { projectRootFor } = await import("../../../src/main/linting/engines/project-root");

	return {
		projectRootFor,
		ENGINES: [
			{
				source: "sonarlint",
				run: async ({ projectPath }: { projectPath: string | null }) => {
					runs.push({ source: "sonarlint", projectPath });

					return sonarlintResult();
				},
			},
			{
				source: "tailwindcss",
				run: async ({ projectPath }: { projectPath: string | null }) => {
					runs.push({ source: "tailwindcss", projectPath });

					return tailwindResult();
				},
			},
		],
	};
});

const { lintFile } = await import("../../../src/main/linting/lint-file");

const project = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-lintfile-"));
const source = path.join(project, "src", "cart.ts");

fs.writeFileSync(path.join(project, "package.json"), '{"name":"probe"}');
fs.mkdirSync(path.dirname(source), { recursive: true });

const finding = (over: Partial<Diagnostic>): Diagnostic => ({
	source: "sonarlint",
	rule: "sonarlint/typescript:S1764",
	code: "typescript:S1764",
	message: "Correct one of the identical sub-expressions.",
	url: null,
	line: 2,
	column: 7,
	endLine: 2,
	endColumn: 21,
	...over,
});

beforeEach(() => {
	runs.length = 0;
	sonarlintResult = async () => null;
	tailwindResult = async () => null;
});

describe("lintFile", () => {
	it("answers about the file it was asked about", async () => {
		expect((await lintFile(source, "")).path).toBe(source);
	});

	it("has nothing to report when no engine is running", async () => {
		expect((await lintFile(source, "")).diagnostics).toEqual([]);
	});

	it("hands every engine the project root it found from the file", async () => {
		await lintFile(source, "");

		expect(runs).toHaveLength(2);
		expect(runs.every((run) => run.projectPath === project)).toBe(true);
	});

	it("gathers findings from every engine that answered", async () => {
		sonarlintResult = async () => ({ diagnostics: [finding({})] });
		tailwindResult = async () => ({
			diagnostics: [finding({ source: "tailwindcss", code: "suggestCanonicalClasses" })],
		});

		const sources = (await lintFile(source, "")).diagnostics.map((found) => found.source);

		expect(sources).toEqual(["sonarlint", "tailwindcss"]);
	});

	it("keeps one engine's findings when the other has nothing", async () => {
		tailwindResult = async () => ({ diagnostics: [finding({ source: "tailwindcss" })] });

		const { diagnostics } = await lintFile(source, "");

		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0].source).toBe("tailwindcss");
	});

	it("keeps going when an engine throws rather than losing the other's findings", async () => {
		sonarlintResult = async () => {
			throw new Error("server died");
		};
		tailwindResult = async () => ({ diagnostics: [finding({ source: "tailwindcss" })] });

		const { diagnostics } = await lintFile(source, "");

		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0].source).toBe("tailwindcss");
	});

	it("still answers for a file that belongs to no project", async () => {
		const loose = path.join(os.tmpdir(), "lazify-loose-file.ts");

		fs.writeFileSync(loose, "const a = 1;\n");

		expect((await lintFile(loose, "const a = 1;\n")).diagnostics).toEqual([]);
	});
});
