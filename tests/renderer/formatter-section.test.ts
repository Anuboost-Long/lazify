// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", async (importOriginal) => ({
	...(await importOriginal<typeof import("react-i18next")>()),
	useTranslation: () => ({
		t: (key: string) => key,
		i18n: { resolvedLanguage: "en", language: "en" },
	}),
}));

const DEFAULTS = {
	printWidth: 100,
	tabWidth: 2,
	useTabs: false,
	semi: true,
	singleQuote: false,
	trailingComma: "none" as const,
	bracketSpacing: true,
	endOfLine: "lf" as const,
};

const setFormatterMode = vi.fn();
const setFormatterDefaults = vi.fn();
const formatSample = vi.fn();

beforeEach(() => {
	vi.resetModules();
	setFormatterMode.mockReset().mockImplementation(async (mode: string) => ({
		mode,
		defaults: DEFAULTS,
	}));
	setFormatterDefaults.mockReset().mockImplementation(async (patch: object) => ({
		mode: "manual",
		defaults: { ...DEFAULTS, ...patch },
	}));
	formatSample.mockReset().mockResolvedValue("const config = { name: 'lazify' };\n");

	Object.defineProperty(globalThis, "lazify", {
		configurable: true,
		value: {
			formatterSettings: vi.fn().mockResolvedValue({ mode: "manual", defaults: DEFAULTS }),
			setFormatterMode,
			setFormatterDefaults,
			formatSample,
		},
	});
});

afterEach(() => cleanup());

/**
 * The settings live in a module-scoped atom that is fetched once, so each test
 * takes a fresh copy of the module rather than inheriting the last one's mode.
 */
async function mount() {
	const { FormatterSection } =
		await import("../../src/renderer/features/settings/components/FormatterSection");

	render(createElement(FormatterSection));
	await screen.findByText("settings.format_auto");
}

describe("the formatting settings page", () => {
	it("offers the switch between formatting on its own and on request", async () => {
		await mount();

		expect(screen.getAllByRole("switch").length).toBeGreaterThan(0);
		expect(screen.getByText("settings.format_auto")).toBeDefined();
	});

	it("turns the automatic pass on through the main process, not local state", async () => {
		await mount();

		const [modeToggle] = screen.getAllByRole("switch");
		await userEvent.click(modeToggle);

		expect(setFormatterMode).toHaveBeenCalledWith("auto");
	});

	it("describes what manual means while it is manual", async () => {
		await mount();

		expect(screen.getByText("settings.format_manual_desc")).toBeDefined();
	});

	it("keeps the fallback rules together with a preview of what they do", async () => {
		await mount();

		expect(screen.getByText("settings.format_defaults")).toBeDefined();
		expect(screen.getByText("settings.format_defaults_desc")).toBeDefined();
		expect(screen.getByText("settings.format_preview")).toBeDefined();
		await waitFor(() => expect(formatSample).toHaveBeenCalledWith(DEFAULTS));
	});

	it("sends a changed rule on to be stored, and re-renders the preview from it", async () => {
		await mount();

		const increase = screen.getByRole("button", {
			name: "global_term.increase settings.format_print_width",
		});
		await userEvent.click(increase);

		expect(setFormatterDefaults).toHaveBeenCalledWith({ printWidth: 110 });
		await waitFor(() => expect(formatSample).toHaveBeenCalledWith({ ...DEFAULTS, printWidth: 110 }));
	});

	it("names its steppers for the rule they change, not the symbol on them", async () => {
		await mount();

		expect(
			screen.getByRole("button", {
				name: "global_term.decrease settings.format_tab_width",
			}),
		).toBeDefined();
	});
});
