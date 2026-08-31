// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HomePage } from "../../src/renderer/features/home/pages/HomePage";

vi.mock("react-i18next", async (importOriginal) => ({
	...(await importOriginal<typeof import("react-i18next")>()),
	useTranslation: () => ({
		t: (key: string) => key,
		i18n: { resolvedLanguage: "en", language: "en" },
	}),
}));

const navigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => ({
	...(await importOriginal<typeof import("react-router-dom")>()),
	useNavigate: () => navigate,
}));

beforeEach(() => {
	navigate.mockClear();
	localStorage.clear();

	Object.defineProperty(globalThis, "ResizeObserver", {
		writable: true,
		value: class {
			observe() {}
			disconnect() {}
		},
	});

	Object.defineProperty(globalThis, "lazify", {
		writable: true,
		value: new Proxy({}, { get: () => async () => [] }),
	});
});

afterEach(() => cleanup());

const renderHome = (activeProjectPath: string | null) =>
	render(
		createElement(
			MemoryRouter,
			null,
			createElement(HomePage, {
				projects: [],
				activeProjectPath,
				onActiveProjectChange: vi.fn(),
			}),
		),
	);

describe("home desktop windows", () => {
	it("opens a window from its icon, fills the screen, and closes again", async () => {
		renderHome(null);

		expect(screen.queryByRole("region", { name: "home.your_tasks" })).toBeNull();

		await userEvent.click(screen.getByRole("button", { name: /home.tasks_window/ }));
		const tasks = screen.getByRole("region", { name: "home.your_tasks" });

		await userEvent.click(screen.getByRole("button", { name: "home.maximize_window" }));
		expect(screen.getByRole("button", { name: "home.restore_size" })).toBeTruthy();

		await userEvent.click(screen.getByRole("button", { name: "home.close_window" }));
		expect(screen.queryByRole("region", { name: "home.your_tasks" })).toBeNull();
		expect(tasks).not.toBeNull();
	});
});

describe("customizing the desktop", () => {
	it("opens from its own icon and remembers a backdrop and a widget", async () => {
		renderHome(null);

		await userEvent.click(screen.getByRole("button", { name: /home.customize/ }));
		expect(screen.getByRole("region", { name: "home.customize" })).toBeTruthy();

		await userEvent.click(screen.getByRole("button", { name: "home.backdrop_grid" }));
		await userEvent.click(screen.getByRole("button", { name: "home.widget_tasks" }));

		const stored = JSON.parse(localStorage.getItem("lazify-desktop-personalization") ?? "{}");
		expect(stored.backdrop).toBe("grid");
		expect(stored.widgets).toContain("tasks");
	});

	it("tints only this screen, leaving the app accent alone", async () => {
		renderHome(null);

		await userEvent.click(screen.getByRole("button", { name: /home.customize/ }));
		await userEvent.click(screen.getByRole("button", { name: "violet" }));

		const stored = JSON.parse(localStorage.getItem("lazify-desktop-personalization") ?? "{}");
		expect(stored.tint).toBe("violet");
		expect(localStorage.getItem("lazify-accent-color")).toBeNull();
	});
});

describe("home desktop shortcuts", () => {
	it("opens the agents page whether or not a project is active", async () => {
		renderHome(null);
		await userEvent.click(screen.getByRole("button", { name: /navigation.agents/ }));
		expect(navigate).toHaveBeenCalledWith("/agents");

		cleanup();
		navigate.mockClear();

		renderHome("/Users/me/thing");
		await userEvent.click(screen.getByRole("button", { name: /navigation.agents/ }));
		expect(navigate).toHaveBeenCalledWith("/agents?project=%2FUsers%2Fme%2Fthing");
	});
});
