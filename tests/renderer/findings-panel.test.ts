// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Diagnostic, FindingReference } from "../../src/main/linting";
import { FindingsPanel } from "../../src/renderer/shared/ui/code/diagnostics/FindingsPanel";
import {
	CodeQualityActionsProvider,
	type CodeQualityActions,
} from "../../src/renderer/shared/ui/code/diagnostics/quality-actions";

vi.mock("react-i18next", async (importOriginal) => ({
	...(await importOriginal<typeof import("react-i18next")>()),
	useTranslation: () => ({
		t: (key: string, options?: { count?: number }) =>
			options?.count === undefined ? key : `${key}:${options.count}`,
		i18n: { resolvedLanguage: "en", language: "en" },
	}),
}));

afterEach(() => cleanup());

function finding(over: Partial<Diagnostic>): FindingReference {
	return {
		diagnostic: {
			source: "sonarlint",
			rule: "sonarlint/typescript:S1854",
			code: "S1854",
			message: "Remove this useless assignment.",
			url: null,
			line: 3,
			column: 1,
			endLine: 3,
			endColumn: 8,
			...over,
		},
		filePath: "/p/src/cart.ts",
		snippet: "const s = 1;",
		snippetStartLine: 1,
	};
}

const first = finding({ line: 3, message: "First finding." });
const second = finding({ line: 9, code: "S1764", message: "Second finding." });

function panel(actions: CodeQualityActions | null, onReveal = vi.fn()) {
	const inner = createElement(FindingsPanel, { findings: [first, second], onReveal });

	return actions ? createElement(CodeQualityActionsProvider, { actions, children: inner }) : inner;
}

describe("FindingsPanel", () => {
	it("counts the findings without opening the list", () => {
		render(panel(null));

		expect(screen.getByText("code_quality.finding_count:2")).toBeTruthy();
		expect(screen.queryByText("First finding.")).toBeNull();
	});

	it("shows nothing at all for a clean file", () => {
		const { container } = render(createElement(FindingsPanel, { findings: [], onReveal: vi.fn() }));

		expect(container.firstChild).toBeNull();
	});

	it("sends every finding when none is ticked", async () => {
		const fix = vi.fn();
		render(panel({ fix }));

		await userEvent.click(screen.getByText("code_quality.fix_with_agent"));
		expect(fix).toHaveBeenCalledWith([first, second]);
	});

	it("sends only what is ticked", async () => {
		const fix = vi.fn();
		render(panel({ fix }));

		await userEvent.click(screen.getByRole("button", { expanded: false }));
		await userEvent.click(screen.getByLabelText("Second finding."));
		await userEvent.click(screen.getByText("code_quality.fix_with_agent"));

		expect(fix).toHaveBeenCalledWith([second]);
		expect(screen.getByText("code_quality.selected_count:1")).toBeTruthy();
	});

	it("ticks and unticks the lot together", async () => {
		render(panel({ fix: vi.fn() }));

		await userEvent.click(screen.getByRole("button", { expanded: false }));

		const box = screen.getByLabelText("Second finding.") as HTMLInputElement;
		await userEvent.click(screen.getByText("code_quality.select_all"));
		expect(box.checked).toBe(true);

		await userEvent.click(screen.getByText("code_quality.select_all"));
		expect(box.checked).toBe(false);
	});

	it("writes the same batch down as a task", async () => {
		const createTask = vi.fn();
		render(panel({ fix: vi.fn(), createTask }));

		await userEvent.click(screen.getByText("code_quality.create_task"));
		expect(createTask).toHaveBeenCalledWith([first, second]);
	});

	it("offers no task where tasks cannot be reached", () => {
		render(panel({ fix: vi.fn() }));

		expect(screen.queryByText("code_quality.create_task")).toBeNull();
		expect(screen.getByText("code_quality.fix_with_agent")).toBeTruthy();
	});

	it("reveals the line a finding sits on", async () => {
		const onReveal = vi.fn();
		render(panel(null, onReveal));

		await userEvent.click(screen.getByRole("button", { expanded: false }));
		await userEvent.click(screen.getByText("Second finding."));

		expect(onReveal).toHaveBeenCalledWith(9);
	});
});
