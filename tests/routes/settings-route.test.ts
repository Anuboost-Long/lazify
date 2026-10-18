// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStore, Provider } from "jotai";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsRoute } from "@/routes/SettingsRoute";

vi.mock("react-i18next", async (importOriginal) => ({
	...(await importOriginal<typeof import("react-i18next")>()),
	useTranslation: () => ({
		t: (key: string) => key,
		i18n: { resolvedLanguage: "en", language: "en" },
	}),
}));

beforeEach(() => {
	globalThis.localStorage.clear();
	Object.defineProperty(globalThis, "lazify", {
		configurable: true,
		value: new Proxy(
			{},
			{
				get: (_target, name) =>
					typeof name === "string" && name.startsWith("on") ? () => () => {} : async () => [],
			},
		),
	});
});

afterEach(() => cleanup());

const renderAt = (address: string, store = createStore()) =>
	render(
		createElement(
			Provider,
			{ store },
			createElement(MemoryRouter, { initialEntries: [address] }, createElement(SettingsRoute)),
		),
	);

describe("settings route", () => {
	it("opens the section the address names", () => {
		renderAt("/settings?section=keyboard");

		expect(screen.getByText("settings.keyboard_shortcuts")).toBeTruthy();
	});

	it("comes back to the section left last when the address names none", async () => {
		const store = createStore();
		const first = renderAt("/settings", store);
		await userEvent.click(screen.getByRole("button", { name: /settings\.keyboard_desc/ }));
		first.unmount();

		renderAt("/settings", store);

		expect(screen.getByText("settings.keyboard_shortcuts")).toBeTruthy();
	});

	it("falls back to the section left last for a section that does not exist", () => {
		renderAt("/settings?section=nowhere");

		expect(screen.queryByText("settings.keyboard_shortcuts")).toBeNull();
	});
});
