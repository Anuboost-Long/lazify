// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BrowserGuest } from "@/features/browser/components/BrowserGuest";
import { classifyLoadError } from "@/features/browser/lib/browser-error";
import type { BrowserTab } from "@/features/browser/hooks/use-browser-tabs";
import type { BrowserViewLoadFailureReason } from "@chain/sdk";

// The guest is a native view placed by the platform layer; a plain event
// target stands in for it, and jsdom has no ResizeObserver to place it with.
vi.mock("@/platform/browser-view", () => ({
  openGuest: () => Object.assign(new EventTarget(), { place: () => {}, show: () => {}, close: () => {} })
}));
globalThis.ResizeObserver ??= class {
  observe() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "en", language: "en" }
  })
}));

function tab(url: string): BrowserTab {
  return { id: "tab-1", url, currentUrl: url, title: "", navSeq: 0 };
}

function failedLoad(reason: BrowserViewLoadFailureReason, code: number, description = "") {
  return Object.assign(new Event("did-fail-load"), {
    reason,
    errorCode: code,
    errorDescription: description,
    validatedURL: "https://example.com",
    isMainFrame: true
  });
}

function mount(url = "https://example.com") {
  let element: HTMLElement | null = null;

  render(
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

  const view = element as unknown as HTMLElement;
  Object.assign(view, { reload: vi.fn(), getURL: () => url, getTitle: () => "" });

  return view;
}

beforeEach(() => {
  Object.defineProperty(globalThis, "lazify", {
    configurable: true,
    value: { openExternalUrl: vi.fn().mockResolvedValue(undefined) }
  });
});

afterEach(() => cleanup());

describe("sorting a failed load", () => {
  // Different by design: WebKit's failures arrive sorted into reasons by
  // Chain, not as Chromium's net error codes (ticket 042).
  it("names the case behind each reason", () => {
    expect(classifyLoadError("offline")).toBe("no-internet");
    expect(classifyLoadError("host-not-found")).toBe("site-not-found");
    expect(classifyLoadError("unreachable")).toBe("site-unreachable");
    expect(classifyLoadError("insecure-connection")).toBe("insecure-certificate");
    expect(classifyLoadError("blocked")).toBe("blocked");
    expect(classifyLoadError("other")).toBe("unknown");
  });

  it("calls anything offline, whatever the reason says", () => {
    // With no network, DNS fails exactly as a mistyped host does.
    expect(classifyLoadError("host-not-found", false)).toBe("no-internet");
  });
});

describe("a tab whose page did not load", () => {
  it("shows the screen for the case it was given", () => {
    const view = mount();

    act(() => {
      view.dispatchEvent(failedLoad("unreachable", -1004, "Could not connect to the server."));
    });

    expect(screen.getByText("browser.error_site_unreachable_title")).toBeTruthy();
    expect(screen.getByText("Could not connect to the server. (-1004)")).toBeTruthy();
  });

  // The shield's own case waits on Lazy Shield (chain-sdk request 21).
  it("says the address was refused", () => {
    const view = mount();

    act(() => {
      view.dispatchEvent(failedLoad("blocked", 103, "Not allowed to use restricted network port"));
    });

    expect(screen.getByText("browser.error_blocked_by_policy_advice")).toBeTruthy();
  });

  it("leaves a page that loaded alone when one of its frames fails", () => {
    const view = mount();

    act(() => {
      view.dispatchEvent(
        Object.assign(new Event("did-fail-load"), {
          errorCode: -102,
          isMainFrame: false
        })
      );
    });

    expect(screen.queryByText("browser.error_site_unreachable_title")).toBeNull();
  });

  it("clears the screen once a new load starts", () => {
    const view = mount();

    act(() => {
      view.dispatchEvent(failedLoad("unreachable", -1004, "Could not connect to the server."));
    });
    act(() => {
      view.dispatchEvent(new Event("did-start-loading"));
    });

    expect(screen.queryByText("browser.error_site_unreachable_title")).toBeNull();
  });

  it("explains a crash, which never reaches did-fail-load", () => {
    const view = mount();

    act(() => {
      view.dispatchEvent(new Event("crashed"));
    });

    expect(screen.getByText("browser.error_page_crashed_title")).toBeTruthy();
  });
});
