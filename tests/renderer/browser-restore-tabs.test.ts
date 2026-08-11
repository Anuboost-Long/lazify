// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TABS_KEY = "lazify-browser-tabs";
const RESTORE_KEY = "lazify-browser-restore-tabs";

/**
 * Imported per test: both the setting and the stored tabs are read when their
 * modules are first evaluated, which is what makes the choice apply at startup.
 */
async function mountTabs() {
  const { useBrowserTabs } = await import(
    "../../src/renderer/features/browser/hooks/use-browser-tabs"
  );

  return renderHook(() => useBrowserTabs());
}

function storeTabs() {
  localStorage.setItem(
    TABS_KEY,
    JSON.stringify([
      { id: "tab-1", url: "https://example.com", title: "Example" },
      { id: "tab-2", url: "https://anthropic.com", title: "Anthropic" }
    ])
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();

  Object.defineProperty(globalThis, "lazify", {
    configurable: true,
    value: { onBrowserOpenTab: vi.fn().mockReturnValue(() => {}) }
  });
});

afterEach(() => cleanup());

describe("remembering browser tabs", () => {
  it("reopens the stored tabs by default", async () => {
    storeTabs();

    const { result } = await mountTabs();

    expect(result.current.tabs.map((tab) => tab.url)).toEqual([
      "https://example.com",
      "https://anthropic.com"
    ]);
  });

  it("starts with one empty tab when restoring is turned off", async () => {
    storeTabs();
    localStorage.setItem(RESTORE_KEY, "false");

    const { result } = await mountTabs();

    expect(result.current.tabs).toHaveLength(1);
    expect(result.current.tabs[0].url).toBe("");
  });

  it("drops the stored session rather than leaving it on disk", async () => {
    storeTabs();
    localStorage.setItem(RESTORE_KEY, "false");

    await mountTabs();

    expect(localStorage.getItem(TABS_KEY)).toBeNull();
  });

  it("keeps remembering while the setting is on", async () => {
    const { result } = await mountTabs();

    act(() => {
      result.current.openTab("example.com");
    });

    const stored = JSON.parse(localStorage.getItem(TABS_KEY) as string);
    expect(stored.map((tab: { url: string }) => tab.url)).toContain(
      "https://example.com"
    );
  });
});
