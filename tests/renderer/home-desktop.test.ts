// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
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

// xterm needs a real canvas to open on; the desktop is what is under test here.
vi.mock("../../src/renderer/features/workspace/components/XTermPanel", () => ({
	XTermPanel: ({ runId }: { runId: string }) => createElement("div", { "data-terminal": runId }),
}));

const runningAgent = {
	runId: "pty-agent",
	scriptName: "Claude Code",
	projectPath: "/Users/me/thing",
	projectName: "thing",
	pid: 1,
	startedAt: "2026-09-01T00:00:00.000Z",
	ports: [],
	waiting: false,
	isAgent: true,
};

function withRunningAgent() {
	const listSessions = vi.fn().mockResolvedValue([runningAgent]);
	const listAgents = vi.fn().mockResolvedValue([{ id: "claude", label: "Claude Code" }]);

	Object.defineProperty(globalThis, "lazify", {
		writable: true,
		value: new Proxy(
			{ listSessions, listAgents },
			{
				get: (target, name) =>
					Reflect.get(target, name) ??
					(typeof name === "string" && name.startsWith("on") ? () => () => {} : async () => []),
			},
		),
	});

	return listSessions;
}

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

	it("offers a running agent its own window instead of leaving the screen", async () => {
		const listSessions = withRunningAgent();
		renderHome(null);
		await waitFor(() => expect(listSessions).toHaveBeenCalled());

		await userEvent.click(screen.getByRole("button", { name: /navigation.agents/ }));
		expect(navigate).not.toHaveBeenCalled();

		await userEvent.click(screen.getByRole("button", { name: /Claude Code/ }));

		const window = screen.getByRole("region", { name: "Claude Code" });
		expect(window.querySelector("[data-terminal]")?.getAttribute("data-terminal")).toBe("pty-agent");
		expect(navigate).not.toHaveBeenCalled();
	});

	it("leaves for the agents page when that is the choice made", async () => {
		const listSessions = withRunningAgent();
		renderHome(null);
		await waitFor(() => expect(listSessions).toHaveBeenCalled());

		await userEvent.click(screen.getByRole("button", { name: /navigation.agents/ }));
		await userEvent.click(screen.getByRole("button", { name: /home.go_to_agents/ }));

		expect(navigate).toHaveBeenCalledWith("/agents");
	});
});

describe("the dock", () => {
	it("takes a minimized window off the desktop and brings it back", async () => {
		renderHome(null);
		await userEvent.click(screen.getByRole("button", { name: /home.tasks_window/ }));

		await userEvent.click(screen.getByRole("button", { name: "home.minimize_window" }));
		expect(screen.queryByRole("region", { name: "home.your_tasks" })).toBeNull();

		await userEvent.click(screen.getByRole("button", { name: "home.your_tasks" }));
		expect(screen.getByRole("region", { name: "home.your_tasks" })).toBeTruthy();
	});
});

describe("windows outliving the page", () => {
	it("comes back to the same open windows, and closes them all at once", async () => {
		renderHome(null);
		await userEvent.click(screen.getByRole("button", { name: /home.tasks_window/ }));

		cleanup();
		renderHome(null);
		expect(screen.getByRole("region", { name: "home.your_tasks" })).toBeTruthy();

		await userEvent.click(screen.getByRole("button", { name: "home.close_all_windows" }));
		expect(screen.queryByRole("region", { name: "home.your_tasks" })).toBeNull();

		cleanup();
		renderHome(null);
		expect(screen.queryByRole("region", { name: "home.your_tasks" })).toBeNull();
	});
});
