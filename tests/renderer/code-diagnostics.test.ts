// @vitest-environment jsdom

import { cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Diagnostic } from "../../src/main/linting";
import { useDiagnostics } from "../../src/renderer/shared/hooks/use-diagnostics";
import { CodeSurface } from "../../src/renderer/shared/ui/code/CodeSurface";
import { placeDiagnostics } from "../../src/renderer/shared/ui/code/diagnostics/diagnostic-ranges";
import { DiagnosticCard } from "../../src/renderer/shared/ui/code/diagnostics/DiagnosticCard";

vi.mock("react-i18next", async (importOriginal) => ({
	...(await importOriginal<typeof import("react-i18next")>()),
	useTranslation: () => ({
		t: (key: string) => key,
		i18n: { resolvedLanguage: "en", language: "en" },
	}),
}));

afterEach(() => cleanup());

const CODE = "const answer = 42;\nconst total = 1 + 1;\n";

function found(over: Partial<Diagnostic> = {}): Diagnostic {
	return {
		source: "sonarlint",
		rule: "sonarlint/typescript:S1764",
		code: "S1764",
		message: "Correct one of the identical sub-expressions.",
		url: "https://sonarsource.github.io/rspec/#/rspec/S1764/javascript",
		line: 2,
		column: 15,
		endLine: 2,
		endColumn: 20,
		...over,
	};
}

describe("placing a finding on painted code", () => {
	function paint(content = CODE) {
		const { container } = render(createElement(CodeSurface, { content, fileName: "answer.ts" }));

		return container.querySelector("pre") as HTMLElement;
	}

	it("covers exactly the columns the rule reported", () => {
		const placed = placeDiagnostics(paint(), [found()]);

		expect(placed).toHaveLength(1);
		expect(placed[0].range.toString()).toBe("1 + 1");
	});

	it("keeps a span inside its own line when the rule overshoots the end", () => {
		const placed = placeDiagnostics(paint(), [found({ column: 15, endColumn: 500 })]);

		expect(placed[0].range.toString()).toBe("1 + 1;");
	});

	it("underlines one character for a rule that points at a spot", () => {
		const placed = placeDiagnostics(paint(), [found({ column: 15, endColumn: 15 })]);

		expect(placed[0].range.toString()).toBe("1");
	});

	it("drops a finding on a line this surface is not showing", () => {
		expect(placeDiagnostics(paint(), [found({ line: 99, endLine: 99 })])).toEqual([]);
	});
});

describe("CodeSurface", () => {
	it("names the lines carrying a finding in the gutter", () => {
		const { container } = render(
			createElement(CodeSurface, {
				content: CODE,
				fileName: "answer.ts",
				diagnostics: [found()],
			}),
		);

		const gutter = Array.from(container.querySelectorAll("div")).filter(
			(node) => node.textContent === "1" || node.textContent === "2",
		);
		const marked = gutter.filter((node) => node.className.includes("text-warning"));

		expect(marked).toHaveLength(1);
		expect(marked[0].textContent).toBe("2");
	});

	it("shows no card until a finding is actually hovered", () => {
		render(
			createElement(CodeSurface, {
				content: CODE,
				fileName: "answer.ts",
				diagnostics: [found()],
			}),
		);

		expect(screen.queryByRole("tooltip")).toBeNull();
	});
});

describe("DiagnosticCard", () => {
	it("gives the reader the rule, its number, and a way to the rule itself", async () => {
		const openExternalUrl = vi.fn();
		vi.stubGlobal("lazify", { openExternalUrl });

		render(
			createElement(DiagnosticCard, {
				state: { diagnostic: found(), x: 40, y: 80 },
				onPointerEnter: () => {},
				onPointerLeave: () => {},
			}),
		);

		expect(screen.getByRole("tooltip").textContent).toContain(found().message);
		expect(screen.getByText("S1764")).toBeTruthy();

		await userEvent.click(screen.getByRole("button"));
		expect(openExternalUrl).toHaveBeenCalledWith(found().url);

		vi.unstubAllGlobals();
	});
});

describe("useDiagnostics", () => {
	const lintFile = vi.fn();

	beforeEach(() => {
		lintFile.mockReset();
		lintFile.mockResolvedValue({ path: "a.ts", diagnostics: [found()], skipped: null });
		vi.stubGlobal("lazify", { lintFile });
	});

	afterEach(() => vi.unstubAllGlobals());

	it("scans the focused file once the typing settles", async () => {
		const { result } = renderHook(() => useDiagnostics("/p/a.ts", CODE));

		expect(result.current.scanning).toBe(true);
		await waitFor(() => expect(result.current.diagnostics).toHaveLength(1));
		expect(lintFile).toHaveBeenCalledWith("/p/a.ts", CODE);
		expect(lintFile).toHaveBeenCalledTimes(1);
	});

	it("scans nothing while there is no file, or while it is switched off", async () => {
		renderHook(() => useDiagnostics(null, CODE));
		renderHook(() => useDiagnostics("/p/a.ts", CODE, false));

		await new Promise((resolve) => setTimeout(resolve, 600));
		expect(lintFile).not.toHaveBeenCalled();
	});

	it("folds a burst of edits into one scan of the latest buffer", async () => {
		const { rerender, result } = renderHook(
			({ content }: { content: string }) => useDiagnostics("/p/a.ts", content),
			{ initialProps: { content: "a" } },
		);

		rerender({ content: "ab" });
		rerender({ content: "abc" });

		await waitFor(() => expect(result.current.scanning).toBe(false));
		expect(lintFile).toHaveBeenCalledTimes(1);
		expect(lintFile).toHaveBeenCalledWith("/p/a.ts", "abc");
	});
});
