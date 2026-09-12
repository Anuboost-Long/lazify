// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const HISTORY_KEY = "lazify-browser-history";

async function mountHistory() {
	const { useBrowserHistory } = await import(
		"../../src/renderer/features/browser/hooks/use-browser-history"
	);

	return renderHook(() => useBrowserHistory());
}

beforeEach(() => {
	localStorage.clear();
	vi.resetModules();
});

afterEach(() => cleanup());

describe("browser history", () => {
	it("logs a visit and persists it", async () => {
		const { result } = await mountHistory();

		act(() => {
			result.current.recordVisit("https://example.com", "Example");
		});

		expect(result.current.history).toHaveLength(1);
		expect(result.current.history[0]).toMatchObject({
			url: "https://example.com",
			title: "Example",
		});

		const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) as string);
		expect(stored).toHaveLength(1);
	});

	it("updates the top entry in place for the same address instead of duplicating it", async () => {
		const { result } = await mountHistory();

		act(() => {
			result.current.recordVisit("https://example.com", "");
		});
		act(() => {
			result.current.recordVisit("https://example.com", "Example");
		});

		expect(result.current.history).toHaveLength(1);
		expect(result.current.history[0].title).toBe("Example");
	});

	it("adds a new entry on top when the address changes", async () => {
		const { result } = await mountHistory();

		act(() => {
			result.current.recordVisit("https://example.com", "Example");
		});
		act(() => {
			result.current.recordVisit("https://anthropic.com", "Anthropic");
		});

		expect(result.current.history.map((entry) => entry.url)).toEqual([
			"https://anthropic.com",
			"https://example.com",
		]);
	});

	it("ignores an empty address", async () => {
		const { result } = await mountHistory();

		act(() => {
			result.current.recordVisit("", "");
		});

		expect(result.current.history).toHaveLength(0);
	});

	it("removes one entry by id", async () => {
		const { result } = await mountHistory();

		act(() => {
			result.current.recordVisit("https://example.com", "Example");
		});
		const id = result.current.history[0].id;

		act(() => {
			result.current.removeEntry(id);
		});

		expect(result.current.history).toHaveLength(0);
		expect(localStorage.getItem(HISTORY_KEY)).toBe("[]");
	});

	it("clears the whole log", async () => {
		const { result } = await mountHistory();

		act(() => {
			result.current.recordVisit("https://example.com", "Example");
			result.current.recordVisit("https://anthropic.com", "Anthropic");
		});

		act(() => {
			result.current.clearHistory();
		});

		expect(result.current.history).toHaveLength(0);
		expect(localStorage.getItem(HISTORY_KEY)).toBe("[]");
	});
});
