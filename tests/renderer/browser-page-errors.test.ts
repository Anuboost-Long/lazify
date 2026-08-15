// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BrowserGuest } from "../../src/renderer/features/browser/components/BrowserGuest";
import {
  classifyLoadError,
  isAbortedLoad
} from "../../src/renderer/features/browser/lib/browser-error";
import type { BrowserTab } from "../../src/renderer/features/browser/hooks/use-browser-tabs";

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

function failedLoad(code: number, description = "") {
  return Object.assign(new Event("did-fail-load"), {
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
  it("names the case behind each net error code", () => {
    expect(classifyLoadError(-106)).toBe("no-internet");
    expect(classifyLoadError(-105)).toBe("site-not-found");
    expect(classifyLoadError(-102)).toBe("site-unreachable");
    expect(classifyLoadError(-201)).toBe("insecure-certificate");
    expect(classifyLoadError(-20)).toBe("blocked");
    expect(classifyLoadError(-999)).toBe("unknown");
  });

  it("calls anything offline, whatever the code says", () => {
    // With no network, DNS fails exactly as a mistyped host does.
    expect(classifyLoadError(-105, false)).toBe("no-internet");
  });

  it("does not treat a cancelled load as a failure", () => {
    expect(isAbortedLoad(-3)).toBe(true);
  });
});

describe("a tab whose page did not load", () => {
  it("shows the screen for the case it was given", () => {
    const view = mount();

    act(() => {
      view.dispatchEvent(failedLoad(-102, "ERR_CONNECTION_REFUSED"));
    });

    expect(screen.getByText("browser.error_site_unreachable_title")).toBeTruthy();
    expect(screen.getByText("ERR_CONNECTION_REFUSED (-102)")).toBeTruthy();
  });

  it("says the shield blocked it when the shield is what did", () => {
    const view = mount();

    act(() => {
      view.dispatchEvent(failedLoad(-20, "ERR_BLOCKED_BY_CLIENT"));
    });

    expect(screen.getByText("browser.error_blocked_by_shield_advice")).toBeTruthy();
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

  it("stays quiet when the load was merely stopped", () => {
    const view = mount();

    act(() => {
      view.dispatchEvent(failedLoad(-3, "ERR_ABORTED"));
    });

    expect(screen.queryByText("browser.error_unknown_title")).toBeNull();
  });

  it("clears the screen once a new load starts", () => {
    const view = mount();

    act(() => {
      view.dispatchEvent(failedLoad(-102, "ERR_CONNECTION_REFUSED"));
    });
    act(() => {
      view.dispatchEvent(new Event("did-start-loading"));
    });

    expect(screen.queryByText("browser.error_site_unreachable_title")).toBeNull();
  });

  it("explains a crash, which never reaches did-fail-load", () => {
    const view = mount();

    act(() => {
      view.dispatchEvent(new Event("render-process-gone"));
    });

    expect(screen.getByText("browser.error_page_crashed_title")).toBeTruthy();
  });
});
