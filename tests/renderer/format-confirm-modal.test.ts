// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FormatChangesModal } from "../../src/renderer/features/agents/components/FormatChangesModal";

vi.mock("react-i18next", async (importOriginal) => ({
	...(await importOriginal<typeof import("react-i18next")>()),
	useTranslation: () => ({
		t: (key: string, values?: Record<string, unknown>) =>
			values ? `${key}:${JSON.stringify(values)}` : key,
		i18n: { resolvedLanguage: "en", language: "en" },
	}),
}));

const PROJECT = "/workspace/demo";

const formatChangedFiles = vi.fn();
const onClose = vi.fn();
const onFormatted = vi.fn();

const PLAN = {
	formatted: ["src/one.ts", "src/two.ts"],
	unchanged: ["src/tidy.ts"],
	failed: [{ path: "src/broken.ts", message: "Unexpected token" }],
	configFile: ".prettierrc",
};

function modal(open = true) {
	return createElement(FormatChangesModal, {
		projectPath: PROJECT,
		open,
		onClose,
		onFormatted,
	});
}

beforeEach(() => {
	onClose.mockReset();
	onFormatted.mockReset();
	formatChangedFiles.mockReset().mockResolvedValue(PLAN);

	Object.defineProperty(globalThis, "lazify", {
		configurable: true,
		value: {
			formatChangedFiles,
			projectFormatter: vi.fn().mockResolvedValue({ configFile: ".prettierrc" }),
			onCodeFormatted: vi.fn().mockReturnValue(() => undefined),
		},
	});
});

afterEach(() => cleanup());

describe("confirming before anything is rewritten", () => {
	it("asks what would change without writing any of it", async () => {
		render(modal());

		await waitFor(() =>
			expect(formatChangedFiles).toHaveBeenCalledWith(PROJECT, undefined, "preview"),
		);

		// The only call so far is the dry run. Nothing has been written.
		expect(formatChangedFiles.mock.calls.every((call) => call[2] === "preview")).toBe(true);
	});

	it("separates what it will rewrite from what is already tidy", async () => {
		render(modal());

		await waitFor(() => expect(screen.getByText("agents.format_will_rewrite")).toBeDefined());

		expect(screen.getByText("agents.format_already_tidy")).toBeDefined();
		expect(screen.getByText("agents.format_cannot")).toBeDefined();
	});

	it("counts the files on the button that does the work", async () => {
		render(modal());

		await waitFor(() =>
			expect(screen.getByRole("button", { name: /agents.format_proceed:{"count":2}/ })).toBeDefined(),
		);
	});

	it("names the rules it is about to apply", async () => {
		render(modal());

		await waitFor(() =>
			expect(screen.getByText('agents.format_by_project:{"config":".prettierrc"}')).toBeDefined(),
		);
	});

	it("writes only once Proceed is pressed, and says it is done", async () => {
		render(modal());

		const proceed = await screen.findByRole("button", {
			name: /agents.format_proceed/,
		});
		await userEvent.click(proceed);

		await waitFor(() => expect(formatChangedFiles).toHaveBeenCalledWith(PROJECT, undefined, "write"));
		await waitFor(() => expect(onFormatted).toHaveBeenCalled());
		await waitFor(() => expect(onClose).toHaveBeenCalled());
	});

	it("writes nothing when it is cancelled", async () => {
		render(modal());

		await screen.findByRole("button", { name: /agents.format_proceed/ });
		await userEvent.click(screen.getByRole("button", { name: "global_term.cancel" }));

		expect(formatChangedFiles.mock.calls.some((call) => call[2] === "write")).toBe(false);
		expect(onClose).toHaveBeenCalled();
	});

	it("offers nothing to proceed with when everything is already tidy", async () => {
		formatChangedFiles.mockResolvedValue({
			formatted: [],
			unchanged: ["src/tidy.ts"],
			failed: [],
			configFile: null,
		});

		render(modal());

		await waitFor(() => expect(screen.getByText("agents.format_nothing_to_do")).toBeDefined());

		const proceed = screen.getByRole("button", { name: /agents.format_proceed/ });

		expect(proceed.hasAttribute("disabled")).toBe(true);
	});

	it("asks nothing at all while it is closed", () => {
		render(modal(false));

		expect(formatChangedFiles).not.toHaveBeenCalled();
	});
});
