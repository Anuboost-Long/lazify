// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AgentChangesPanel } from "../../src/renderer/features/agents/components/AgentChangesPanel";
import type { AgentFileChange } from "../../src/renderer/shared/types/lazify";

vi.mock("react-i18next", async (importOriginal) => ({
	...(await importOriginal<typeof import("react-i18next")>()),
	useTranslation: () => ({
		t: (key: string, values?: Record<string, unknown>) =>
			values ? `${key}:${JSON.stringify(values)}` : key,
		i18n: { resolvedLanguage: "en", language: "en" },
	}),
}));

const PROJECT = "/workspace/demo";

function change(path: string): AgentFileChange {
	return {
		path,
		absolutePath: `${PROJECT}/${path}`,
		statusLabel: "Modified",
		untracked: false,
		additions: 4,
		deletions: 1,
	};
}

const formatChangedFiles = vi.fn();
const projectFormatter = vi.fn();
const onRefresh = vi.fn();

/** The auto pass reports through this, so tests can play one back. */
let announceFormatted: ((event: unknown) => void) | null = null;

function panel(changes: AgentFileChange[]) {
	return createElement(AgentChangesPanel, {
		projectPath: PROJECT,
		changes,
		loading: false,
		onRefresh,
		onReset: vi.fn(),
		onClose: vi.fn(),
	});
}

beforeEach(() => {
	announceFormatted = null;
	onRefresh.mockReset();
	projectFormatter.mockReset().mockResolvedValue({ configFile: ".prettierrc" });
	formatChangedFiles.mockReset().mockResolvedValue({
		formatted: ["src/one.ts"],
		unchanged: [],
		failed: [],
		configFile: ".prettierrc",
	});

	Object.defineProperty(globalThis, "lazify", {
		configurable: true,
		value: {
			formatChangedFiles,
			projectFormatter,
			onCodeFormatted: vi.fn().mockImplementation((callback: (event: unknown) => void) => {
				announceFormatted = callback;
				return () => undefined;
			}),
			readFileDiff: vi.fn().mockResolvedValue(""),
			getFileDiff: vi.fn().mockResolvedValue(""),
		},
	});
});

afterEach(() => cleanup());

describe("formatting from the changes panel", () => {
	it("says which rules govern before anything is formatted", async () => {
		render(panel([change("src/one.ts")]));

		await waitFor(() =>
			expect(screen.getByText('agents.format_by_project:{"config":".prettierrc"}')).toBeDefined(),
		);
	});

	it("says when the project declares nothing and the app's own rules apply", async () => {
		projectFormatter.mockResolvedValue({ configFile: null });

		render(panel([change("src/one.ts")]));

		await waitFor(() => expect(screen.getByText("agents.format_by_defaults")).toBeDefined());
	});

	it("asks before rewriting rather than formatting on the spot", async () => {
		render(panel([change("src/one.ts")]));

		await userEvent.click(screen.getByRole("button", { name: /format_changes/ }));

		// The dialog opened; nothing has been written.
		await waitFor(() => expect(screen.getByText("agents.format_title")).toBeDefined());
		expect(formatChangedFiles.mock.calls.some((call) => call[2] === "write")).toBe(false);
	});

	it("reports what the automatic pass moved", async () => {
		render(panel([change("src/one.ts")]));

		await waitFor(() => expect(announceFormatted).not.toBeNull());
		announceFormatted?.({
			projectPath: PROJECT,
			formatted: ["src/one.ts"],
			unchanged: [],
			failed: [],
			configFile: null,
		});

		await waitFor(() => expect(screen.getByText('agents.format_done:{"count":1}')).toBeDefined());
	});

	it("says so when the automatic pass found everything tidy", async () => {
		render(panel([change("src/one.ts")]));

		await waitFor(() => expect(announceFormatted).not.toBeNull());
		announceFormatted?.({
			projectPath: PROJECT,
			formatted: [],
			unchanged: ["src/one.ts"],
			failed: [],
			configFile: null,
		});

		await waitFor(() => expect(screen.getByText("agents.format_none")).toBeDefined());
	});

	it("reports a file the automatic pass could not format", async () => {
		render(panel([change("src/broken.ts")]));

		await waitFor(() => expect(announceFormatted).not.toBeNull());
		announceFormatted?.({
			projectPath: PROJECT,
			formatted: [],
			unchanged: [],
			failed: [{ path: "src/broken.ts", message: "Unexpected token" }],
			configFile: null,
		});

		await waitFor(() => expect(screen.getByText('agents.format_failed:{"count":1}')).toBeDefined());
	});

	it("offers nothing to press when the session has changed nothing", async () => {
		render(panel([]));

		const button = screen.getByRole("button", { name: /format_changes/ });

		expect(button.hasAttribute("disabled")).toBe(true);
	});
});
