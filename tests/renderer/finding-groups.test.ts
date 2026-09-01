import { describe, expect, it } from "vitest";

import type { Diagnostic, FindingReference } from "../../src/main/linting";
import { groupFindings } from "../../src/renderer/shared/ui/code/diagnostics/finding-groups";

function finding(over: Partial<Diagnostic>): FindingReference {
	return {
		diagnostic: {
			source: "sonarlint",
			rule: "sonarlint/typescript:S1854",
			code: "S1854",
			message: "Remove this useless assignment.",
			url: null,
			line: 3,
			column: 2,
			endLine: 3,
			endColumn: 8,
			...over,
		},
		filePath: "/home/dev/shop/src/cart.ts",
		snippet: "line",
		snippetStartLine: 1,
	};
}

const tailwind = finding({
	source: "tailwindcss",
	rule: "tailwindcss/suggestCanonicalClasses",
	code: "suggestCanonicalClasses",
	message: "The class `bg-gradient-to-t` can be written as `bg-linear-to-t`",
});

describe("groupFindings", () => {
	it("keeps each engine's findings in its own group", () => {
		const groups = groupFindings([finding({}), tailwind, finding({ line: 9 })]);

		expect(groups.map((group) => group.source)).toEqual(["sonarlint", "tailwindcss"]);
		expect(groups[0].findings).toHaveLength(2);
		expect(groups[1].findings).toHaveLength(1);
	});

	it("leaves out an engine that found nothing, so no empty heading appears", () => {
		expect(groupFindings([tailwind]).map((group) => group.source)).toEqual(["tailwindcss"]);
		expect(groupFindings([finding({})]).map((group) => group.source)).toEqual(["sonarlint"]);
	});

	it("orders Sonar before Tailwind whatever order they arrived in", () => {
		expect(groupFindings([tailwind, finding({})]).map((group) => group.source)).toEqual([
			"sonarlint",
			"tailwindcss",
		]);
	});

	it("gives every group a label key the panel can translate", () => {
		for (const group of groupFindings([finding({}), tailwind])) {
			expect(group.label).toMatch(/^code_quality\.source_/);
		}
	});

	it("has nothing to show for a clean file", () => {
		expect(groupFindings([])).toEqual([]);
	});
});
