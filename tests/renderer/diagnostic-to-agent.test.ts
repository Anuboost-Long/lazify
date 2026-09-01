// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Diagnostic, FindingReference } from "../../src/main/linting";
import { buildFindingsPayload } from "../../src/renderer/features/agents/utils/diagnostic-payload";
import { CodeSurface } from "../../src/renderer/shared/ui/code/CodeSurface";
import { snippetAround } from "../../src/renderer/shared/ui/code/diagnostics/diagnostic-snippet";
import { DiagnosticCard } from "../../src/renderer/shared/ui/code/diagnostics/DiagnosticCard";
import {
	CodeQualityActionsProvider,
	useCodeQualityActions,
} from "../../src/renderer/shared/ui/code/diagnostics/quality-actions";

vi.mock("react-i18next", async (importOriginal) => ({
	...(await importOriginal<typeof import("react-i18next")>()),
	useTranslation: () => ({
		t: (key: string) => key,
		i18n: { resolvedLanguage: "en", language: "en" },
	}),
}));

afterEach(() => cleanup());

const PROJECT = "/home/dev/shop";

const diagnostic: Diagnostic = {
	source: "sonarlint",
	rule: "sonarlint/typescript:S1764",
	code: "S1764",
	message: 'Correct one of the identical sub-expressions on both sides of operator "&&"',
	url: "https://sonarsource.github.io/rspec/#/rspec/S1764/javascript",
	line: 7,
	column: 7,
	endLine: 7,
	endColumn: 21,
};

const FILE = Array.from({ length: 20 }, (_, index) => `line ${index + 1}`).join("\n");

function errand(over: Partial<FindingReference> = {}): FindingReference {
	return {
		diagnostic,
		filePath: `${PROJECT}/src/cart.ts`,
		snippet: "line 3\nline 4",
		snippetStartLine: 3,
		...over,
	};
}

describe("the code around a finding", () => {
	it("carries the lines either side, so the fix has something to stand on", () => {
		const snippet = snippetAround(FILE, diagnostic);

		expect(snippet.startLine).toBe(3);
		expect(snippet.text.split("\n")).toHaveLength(9);
		expect(snippet.text.startsWith("line 3")).toBe(true);
		expect(snippet.text.endsWith("line 11")).toBe(true);
	});

	it("stops at the edges of a short file", () => {
		const snippet = snippetAround("one\ntwo", { ...diagnostic, line: 1, endLine: 1 });

		expect(snippet.startLine).toBe(1);
		expect(snippet.text).toBe("one\ntwo");
	});
});

describe("the errand an agent receives", () => {
	it("names the rule, the place, and what to leave alone", () => {
		const { title, text } = buildFindingsPayload([errand()], PROJECT)!;

		expect(title).toBe("S1764 · src/cart.ts:7");
		expect(text).toContain("Fix a SonarQube for IDE finding in src/cart.ts.");
		expect(text).toContain("Rule: S1764 (sonarlint/typescript:S1764)");
		expect(text).toContain(diagnostic.message);
		expect(text).toContain(diagnostic.url as string);
		// Absolute, so the agent opens the file instead of searching for it.
		expect(text).toContain(`Reported at ${PROJECT}/src/cart.ts:7`);
		expect(text).toContain("Shown here from line 3:");
		expect(text).toContain("```ts\nline 3\nline 4\n```");
		expect(text).toContain("Leave the surrounding behaviour unchanged");
	});

	it("spells a multi-line finding as a range", () => {
		const { title } = buildFindingsPayload(
			[errand({ diagnostic: { ...diagnostic, endLine: 9 } })],
			PROJECT,
		)!;

		expect(title).toBe("S1764 · src/cart.ts:7-9");
	});

	it("leaves no gap where a rule has no page of its own", () => {
		const { text } = buildFindingsPayload(
			[errand({ diagnostic: { ...diagnostic, code: null, url: null } })],
			PROJECT,
		)!;

		expect(text).toContain("Rule: sonarlint/typescript:S1764");
		expect(text).not.toMatch(/\n\n\n/);
	});
});

describe("handing a finding over", () => {
	it("offers the fix only where an agent can be reached", async () => {
		const onFix = vi.fn();
		const state = { diagnostic, x: 10, y: 10 };
		const card = (fix?: () => void) =>
			createElement(DiagnosticCard, {
				state,
				onPointerEnter: () => {},
				onPointerLeave: () => {},
				onFix: fix,
			});

		const alone = render(card());
		expect(screen.queryByText("code_quality.fix_with_agent")).toBeNull();
		// The rule's own page is still there — reading it needs no agent.
		expect(screen.getByText("code_quality.read_rule")).toBeTruthy();
		alone.unmount();

		render(card(onFix));
		await userEvent.click(screen.getByText("code_quality.fix_with_agent"));
		expect(onFix).toHaveBeenCalled();
	});

	it("carries the findings from the surface to whoever owns the agents", async () => {
		const fix = vi.fn();
		const Probe = () => {
			const actions = useCodeQualityActions();

			return createElement("button", { onClick: () => actions?.fix([errand()]) }, "hand over");
		};

		render(
			createElement(CodeQualityActionsProvider, {
				actions: { fix },
				children: createElement(Probe),
			}),
		);

		await userEvent.click(screen.getByText("hand over"));
		expect(fix).toHaveBeenCalledWith([errand()]);
	});

	it("reaches nobody where no provider is above it", async () => {
		const reached = vi.fn();
		const Probe = () => {
			const actions = useCodeQualityActions();

			return createElement("button", { onClick: () => reached(actions) }, "hand over");
		};

		render(createElement(Probe));
		await userEvent.click(screen.getByText("hand over"));

		expect(reached).toHaveBeenCalledWith(null);
	});

	it("keeps the button away from a surface with no agent behind it", () => {
		render(
			createElement(CodeSurface, {
				content: FILE,
				fileName: "cart.ts",
				diagnostics: [diagnostic],
			}),
		);

		expect(screen.queryByText("code_quality.fix_with_agent")).toBeNull();
	});
});
