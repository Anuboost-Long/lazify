// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TABS_KEY = "lazify-browser-tabs";

async function mountTabs() {
	const { useBrowserTabs } = await import(
		"../../src/renderer/features/browser/hooks/use-browser-tabs"
	);

	return renderHook(() => useBrowserTabs());
}

beforeEach(() => {
	localStorage.clear();
	vi.resetModules();

	Object.defineProperty(globalThis, "lazify", {
		configurable: true,
		value: { onBrowserOpenTab: vi.fn().mockReturnValue(() => {}) },
	});
});

afterEach(() => cleanup());

describe("the full history tab", () => {
	it("opens as its own tab, carrying no address a guest could load", async () => {
		const { result } = await mountTabs();

		act(() => {
			result.current.openHistoryTab("History");
		});

		expect(result.current.activeTab).toMatchObject({
			page: "history",
			url: "",
			title: "History",
		});
	});

	it("switches back to the existing history tab instead of opening a second one", async () => {
		const { result } = await mountTabs();

		act(() => {
			result.current.openHistoryTab("History");
		});
		const firstId = result.current.activeTab?.id;

		act(() => {
			result.current.openTab("https://example.com");
		});
		act(() => {
			result.current.openHistoryTab("History");
		});

		expect(result.current.activeTab?.id).toBe(firstId);
		expect(result.current.tabs.filter((tab) => tab.page === "history")).toHaveLength(1);
	});

	it("is never written to the restored session", async () => {
		const { result } = await mountTabs();

		act(() => {
			result.current.openHistoryTab("History");
		});
		const historyId = result.current.activeTab?.id;

		const stored = JSON.parse(localStorage.getItem(TABS_KEY) as string);
		expect(stored.some((tab: { id: string }) => tab.id === historyId)).toBe(false);
	});
});
