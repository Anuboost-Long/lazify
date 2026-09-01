import { describe, expect, it } from "vitest";

import { buildLintReport } from "../../../src/main/linting/report";
import type { Diagnostic, LintResult } from "../../../src/main/linting/types";

const PROJECT = "/home/dev/shop";

function diagnostic(over: Partial<Diagnostic> = {}): Diagnostic {
	return {
		source: "sonarlint",
		rule: "sonarlint/typescript:S1854",
		code: "S1854",
		message: 'Remove this useless assignment to variable "total"',
		url: "https://rules.sonarsource.com/typescript/RSPEC-1854",
		line: 12,
		column: 5,
		endLine: 12,
		endColumn: 18,
		...over,
	};
}

const result = (path: string, diagnostics: Diagnostic[]): LintResult => ({ path, diagnostics });

describe("buildLintReport", () => {
	it("says nothing when every file is clean", () => {
		expect(buildLintReport([result(`${PROJECT}/src/cart.ts`, [])], PROJECT)).toBe("");
	});

	it("names the rule, the place and the page", () => {
		const report = buildLintReport([result(`${PROJECT}/src/cart.ts`, [diagnostic()])], PROJECT);

		expect(report).toContain("1 SonarQube for IDE finding");
		expect(report).toContain("src/cart.ts");
		expect(report).toContain("12:5");
		expect(report).toContain("S1854 (sonarlint/typescript:S1854)");
		expect(report).toContain("https://rules.sonarsource.com/typescript/RSPEC-1854");
	});

	it("keeps paths inside the project relative and others whole", () => {
		const report = buildLintReport([result("/elsewhere/lib/util.ts", [diagnostic()])], PROJECT);

		expect(report).toContain("/elsewhere/lib/util.ts");
	});

	it("drops clean files from a mixed batch and counts what is left", () => {
		const report = buildLintReport(
			[
				result(`${PROJECT}/src/cart.ts`, [diagnostic(), diagnostic({ line: 30 })]),
				result(`${PROJECT}/src/clean.ts`, []),
			],
			PROJECT,
		);

		expect(report).toContain("2 SonarQube for IDE findings");
		expect(report).not.toContain("clean.ts");
	});

	it("does not claim one engine when two reported", () => {
		const report = buildLintReport(
			[
				result(`${PROJECT}/src/cart.ts`, [diagnostic()]),
				result(`${PROJECT}/src/Card.tsx`, [
					diagnostic({ source: "tailwindcss", rule: "tailwindcss/invalidApply", code: null }),
				]),
			],
			PROJECT,
		);

		expect(report).toContain("2 Code quality findings");
	});
});
