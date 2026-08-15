// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resolveBrowserInput } from "../../src/renderer/features/browser/lib/browser-url";
import { useBrowserTabs } from "../../src/renderer/features/browser/hooks/use-browser-tabs";
import { useBrowserSettings } from "../../src/renderer/shared/hooks/use-browser-settings";
import { findSearchEngine } from "../../src/renderer/shared/lib/search-engines";

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(globalThis, "lazify", {
    configurable: true,
    value: { onBrowserOpenTab: vi.fn().mockReturnValue(() => {}) }
  });
});

afterEach(() => cleanup());

describe("searching from the address bar", () => {
  it("sends a phrase to the engine that was chosen", () => {
    expect(resolveBrowserInput("hello world", "google")).toBe(
      "https://www.google.com/search?q=hello%20world"
    );
    expect(resolveBrowserInput("hello world", "duckduckgo")).toBe(
      "https://duckduckgo.com/?q=hello%20world"
    );
  });

  it("keeps searching DuckDuckGo when nothing was chosen", () => {
    expect(resolveBrowserInput("hello")).toBe("https://duckduckgo.com/?q=hello");
  });

  it("still loads an address as an address", () => {
    expect(resolveBrowserInput("example.com", "google")).toBe("https://example.com");
  });

  it("falls back to the default when the stored choice is nonsense", () => {
    expect(findSearchEngine("altavista").id).toBe("duckduckgo");
  });
});

describe("the chosen engine", () => {
  it("survives a restart", () => {
    const { result, unmount } = renderHook(() => useBrowserSettings());

    act(() => {
      result.current.setSearchEngine("google");
    });
    expect(localStorage.getItem("lazify-browser-search-engine")).toBe("google");
    unmount();

    expect(renderHook(() => useBrowserSettings()).result.current.searchEngine).toBe("google");
  });

  it("is what a typed phrase goes to", () => {
    localStorage.setItem("lazify-browser-search-engine", "google");

    const { result } = renderHook(() => useBrowserTabs());

    act(() => {
      result.current.navigateActive("lazify");
    });

    expect(result.current.activeTab?.url).toBe("https://www.google.com/search?q=lazify");
  });
});
