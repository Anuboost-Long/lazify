// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsPage } from "../../src/renderer/features/settings/pages/SettingsPage";

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "en", language: "en" }
  })
}));

const readZoom = vi.fn();
const stepZoom = vi.fn();
const resetZoom = vi.fn();
const onZoomChanged = vi.fn();
let announce: ((factor: number) => void) | null = null;

beforeEach(() => {
  globalThis.localStorage.clear();
  announce = null;
  readZoom.mockReset();
  readZoom.mockResolvedValue(1);
  stepZoom.mockReset();
  stepZoom.mockResolvedValue(1.1);
  resetZoom.mockReset();
  resetZoom.mockResolvedValue(1);
  onZoomChanged.mockReset();
  onZoomChanged.mockImplementation((callback: (factor: number) => void) => {
    announce = callback;
    return () => undefined;
  });
  Object.defineProperty(globalThis, "lazify", {
    configurable: true,
    value: {
      probeTool: vi.fn().mockResolvedValue(null),
      detectEditors: vi.fn().mockResolvedValue([]),
      readZoom,
      setZoom: vi.fn().mockResolvedValue(1),
      stepZoom,
      resetZoom,
      onZoomChanged
    }
  });
});

afterEach(() => cleanup());

function zoomReading() {
  return screen.getByText(/^\d+%$/).textContent;
}

describe("scaling the whole app", () => {
  it("shows the size the window is actually at", async () => {
    readZoom.mockResolvedValue(1.25);
    render(createElement(SettingsPage));

    await waitFor(() => expect(zoomReading()).toBe("125%"));
  });

  it("takes it a step at a time", async () => {
    render(createElement(SettingsPage));

    await waitFor(() => expect(zoomReading()).toBe("100%"));

    await userEvent.click(screen.getByRole("button", { name: /settings\.zoom_in/i }));

    expect(stepZoom).toHaveBeenCalledWith(1);
    await waitFor(() => expect(zoomReading()).toBe("110%"));

    stepZoom.mockResolvedValue(0.9);
    await userEvent.click(screen.getByRole("button", { name: /settings\.zoom_out/i }));

    expect(stepZoom).toHaveBeenLastCalledWith(-1);
    await waitFor(() => expect(zoomReading()).toBe("90%"));
  });

  it("puts it back to normal, and only offers that when it is not", async () => {
    readZoom.mockResolvedValue(1.5);
    render(createElement(SettingsPage));

    const reset = await screen.findByRole("button", { name: /settings\.zoom_reset/i });

    await waitFor(() => expect(reset).toHaveProperty("disabled", false));

    await userEvent.click(reset);

    expect(resetZoom).toHaveBeenCalled();
    await waitFor(() => expect(zoomReading()).toBe("100%"));
    expect(reset).toHaveProperty("disabled", true);
  });

  it("follows the window when the change came from a shortcut", async () => {
    render(createElement(SettingsPage));

    await waitFor(() => expect(announce).not.toBeNull());

    announce?.(0.75);

    await waitFor(() => expect(zoomReading()).toBe("75%"));
  });
});
