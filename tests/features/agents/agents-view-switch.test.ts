// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, Fragment, useState, type ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PageChromeContext } from "@/app/components/PageChrome";
import { AgentsPage } from "@/features/agents/pages/AgentsPage";
import { isMac } from "@/shared/lib/shortcuts";
import type { SyncedWorkspaceProject } from "@/shared/types/lazify";

vi.mock("react-i18next", async (importOriginal) => ({
	...(await importOriginal<typeof import("react-i18next")>()),
	useTranslation: () => ({
		t: (key: string) => key,
		i18n: { resolvedLanguage: "en", language: "en" },
	}),
}));

// xterm needs a real canvas; which view is showing is what is under test.
vi.mock("@/features/workspace/components/XTermPanel", () => ({
	XTermPanel: () => null,
}));

const project = {
	id: "thing",
	projectName: "thing",
	projectPath: "/Users/me/thing",
	stack: "react-vite",
	lastSyncedAt: "2026-09-01T00:00:00.000Z",
} as SyncedWorkspaceProject;

// The switch sits in the shell's top bar; this stands in for it.
function Shell({ children }: Readonly<{ children: ReactNode }>) {
	const [actions, setActions] = useState<HTMLElement | null>(null);

	return createElement(
		Fragment,
		null,
		createElement("div", { ref: setActions }),
		createElement(PageChromeContext.Provider, { value: { crumb: null, actions } }, children),
	);
}

beforeEach(() => {
	localStorage.clear();
	Object.defineProperty(globalThis, "ResizeObserver", {
		writable: true,
		value: class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	});
	Object.defineProperty(globalThis, "lazify", {
		writable: true,
		value: new Proxy(
			{ platform: "darwin" },
			{
				get: (target, name) =>
					Reflect.get(target, name) ??
					(typeof name === "string" && name.startsWith("on") ? () => () => {} : async () => []),
			},
		),
	});
});

afterEach(() => cleanup());

const renderAgents = (projects: SyncedWorkspaceProject[]) =>
	render(
		createElement(
			MemoryRouter,
			null,
			createElement(
				Shell,
				null,
				createElement(AgentsPage, {
					projects,
					onSyncProject: vi.fn().mockResolvedValue(null),
					onReorderProjects: vi.fn(),
					activeProjectPath: project.projectPath,
					onActiveProjectChange: vi.fn(),
				}),
			),
		),
	);

const segment = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}`) });

describe("agents view switch", () => {
	it("says which view is showing and moves between the two", async () => {
		renderAgents([project]);

		expect(segment("agents.view_tabs").getAttribute("aria-pressed")).toBe("true");
		expect(segment("agents.live_monitor").getAttribute("aria-pressed")).toBe("false");

		await userEvent.click(segment("agents.live_monitor"));
		expect(segment("agents.live_monitor").getAttribute("aria-pressed")).toBe("true");
		expect(screen.getByText("agents.live_monitor_desc")).toBeTruthy();

		await userEvent.click(segment("agents.view_tabs"));
		expect(segment("agents.view_tabs").getAttribute("aria-pressed")).toBe("true");
		expect(screen.queryByText("agents.live_monitor_desc")).toBeNull();
	});

	it("switches with the keyboard shortcut", async () => {
		renderAgents([project]);

		const mod = isMac ? "Meta" : "Control";
		await userEvent.keyboard(`{${mod}>}{Shift>}m{/Shift}{/${mod}}`);

		expect(segment("agents.live_monitor").getAttribute("aria-pressed")).toBe("true");
	});

	it("offers no switch before a project is synced", () => {
		renderAgents([]);

		expect(screen.queryByRole("button", { name: /^agents.view_tabs/ })).toBeNull();
	});
});
