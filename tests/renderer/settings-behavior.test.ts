// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
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

const detectEditors = vi.fn();

beforeEach(() => {
  globalThis.localStorage.clear();
  detectEditors.mockReset();
  detectEditors.mockResolvedValue([
    { id: "vscode", label: "Visual Studio Code", command: "code {folder} -g {file}:{line}" },
    { id: "zed", label: "Zed", command: "zed {folder} {file}:{line}" }
  ]);
  Object.defineProperty(globalThis, "lazify", {
    configurable: true,
    value: { probeTool: vi.fn().mockResolvedValue(null), detectEditors }
  });
});

afterEach(() => cleanup());

describe("settings that are not appearance", () => {
  it("keeps behaviour out of the appearance section", async () => {
    render(createElement(SettingsPage));

    expect(screen.queryByText(/settings\.file_opens$/i)).toBeNull();
    expect(screen.queryByText(/settings\.open_agent_after_send$/i)).toBeNull();
    expect(screen.getByText(/settings\.interface/i)).toBeTruthy();
  });

  it("gathers what the app does when you act under its own section", async () => {
    render(createElement(SettingsPage));

    await userEvent.click(screen.getByRole("button", { name: /settings\.behavior/i }));

    expect(screen.getByText(/settings\.file_opens$/i)).toBeTruthy();
    expect(screen.getByText(/settings\.open_agent_after_send$/i)).toBeTruthy();
    expect(screen.getByText(/settings\.remember_route$/i)).toBeTruthy();
  });

  it("offers the editors this machine actually has, and remembers the one picked", async () => {
    render(createElement(SettingsPage));

    await userEvent.click(screen.getByRole("button", { name: /settings\.behavior/i }));
    await userEvent.click(screen.getByRole("button", { name: /settings\.file_opens_in_editor/i }));

    expect(await screen.findByRole("button", { name: "Visual Studio Code" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Zed" })).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Zed" }));

    expect(globalThis.localStorage.getItem("lazify-editor-command")).toBe(
      "zed {folder} {file}:{line}"
    );
  });

  it("says so when it finds no editor at all", async () => {
    detectEditors.mockResolvedValue([]);
    render(createElement(SettingsPage));

    await userEvent.click(screen.getByRole("button", { name: /settings\.behavior/i }));
    await userEvent.click(screen.getByRole("button", { name: /settings\.file_opens_in_editor/i }));

    expect(await screen.findByText(/settings\.editor_none_found/i)).toBeTruthy();
  });

  it("hides the picker again when files open in the app", async () => {
    render(createElement(SettingsPage));

    await userEvent.click(screen.getByRole("button", { name: /settings\.behavior/i }));
    await userEvent.click(screen.getByRole("button", { name: /settings\.file_opens_in_editor/i }));
    await screen.findByRole("button", { name: "Zed" });
    await userEvent.click(screen.getByRole("button", { name: /settings\.file_opens_in_app/i }));

    expect(screen.queryByRole("button", { name: "Zed" })).toBeNull();
    expect(globalThis.localStorage.getItem("lazify-file-opens-in")).toBe("app");
  });
});
