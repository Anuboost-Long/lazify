// @vitest-environment jsdom

import { act, cleanup, render, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BrowserGuest } from "../../src/renderer/features/browser/components/BrowserGuest";
import {
  useBrowserTabs,
  type BrowserTab
} from "../../src/renderer/features/browser/hooks/use-browser-tabs";

function tab(url: string, navSeq = 0): BrowserTab {
  return { id: "tab-1", url, currentUrl: url, title: "", navSeq };
}

/**
 * Stands in for the guest. What matters is that `getURL()` reports the address
 * the page settled on, which is rarely the one that was typed.
 */
function stubView(element: HTMLElement, reportedUrl: string) {
  Object.assign(element, {
    getURL: () => reportedUrl,
    getTitle: () => "YouTube",
    canGoBack: () => false,
    canGoForward: () => false,
    loadURL: vi.fn().mockResolvedValue(undefined)
  });

  return element as HTMLElement & { loadURL: ReturnType<typeof vi.fn> };
}

function mount(url: string) {
  let element: HTMLElement | null = null;

  const view = render(
    createElement(BrowserGuest, {
      tab: tab(url),
      active: true,
      surfaceVisible: true,
      onRegister: (_id: string, node: HTMLElement | null) => {
        if (node) element = node;
      },
      onStatus: vi.fn(),
      onNavigate: vi.fn()
    } as never)
  );

  return { view, element: element as unknown as HTMLElement };
}

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(globalThis, "lazify", {
    configurable: true,
    value: { onBrowserOpenTab: vi.fn().mockReturnValue(() => {}) }
  });
});

afterEach(() => cleanup());

describe("the address bar", () => {
  it("counts a repeated address as a fresh request", () => {
    const { result } = renderHook(() => useBrowserTabs());

    act(() => {
      result.current.navigateActive("youtube.com");
    });
    expect(result.current.activeTab?.url).toBe("https://youtube.com");
    const first = result.current.activeTab?.navSeq;

    act(() => {
      result.current.navigateActive("youtube.com");
    });

    // The address did not change, so only the count can say "go there again".
    expect(result.current.activeTab?.url).toBe("https://youtube.com");
    expect(result.current.activeTab?.navSeq).toBe((first as number) + 1);
  });
});

describe("a guest that has just loaded its first page", () => {
  it("does not reload when the page settled on a different address", () => {
    const { element } = mount("https://youtube.com");
    // youtube.com answers from www.youtube.com, with a trailing slash the user
    // never typed. Reloading here restarts the player mid-boot.
    const stub = stubView(element, "https://www.youtube.com/");

    act(() => {
      element.dispatchEvent(new Event("dom-ready"));
    });

    expect(stub.loadURL).not.toHaveBeenCalled();
  });

  it("does not reload when the address merely gained a trailing slash", () => {
    const { element } = mount("https://example.com");
    const stub = stubView(element, "https://example.com/");

    act(() => {
      element.dispatchEvent(new Event("dom-ready"));
    });

    expect(stub.loadURL).not.toHaveBeenCalled();
  });

  it("goes back to the address it was given when it is asked for again", () => {
    const { view, element } = mount("https://youtube.com");
    // The user followed links away from what they typed, so the tab's address
    // and the page's have parted ways.
    const stub = stubView(element, "https://www.youtube.com/watch?v=abc");

    act(() => {
      element.dispatchEvent(new Event("dom-ready"));
    });
    expect(stub.loadURL).not.toHaveBeenCalled();

    // Typing the same address again is a fresh request, not a no-op.
    view.rerender(
      createElement(BrowserGuest, {
        tab: tab("https://youtube.com", 1),
        active: true,
        surfaceVisible: true,
        onRegister: vi.fn(),
        onStatus: vi.fn(),
        onNavigate: vi.fn()
      } as never)
    );

    expect(stub.loadURL).toHaveBeenCalledWith("https://youtube.com");
  });

  it("still follows the address bar to somewhere new", () => {
    const { view, element } = mount("https://youtube.com");
    const stub = stubView(element, "https://www.youtube.com/");

    act(() => {
      element.dispatchEvent(new Event("dom-ready"));
    });

    view.rerender(
      createElement(BrowserGuest, {
        tab: tab("https://vimeo.com"),
        active: true,
        surfaceVisible: true,
        onRegister: vi.fn(),
        onStatus: vi.fn(),
        onNavigate: vi.fn()
      } as never)
    );

    expect(stub.loadURL).toHaveBeenCalledWith("https://vimeo.com");
  });
});
