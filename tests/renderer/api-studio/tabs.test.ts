// @vitest-environment jsdom

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "en", language: "en" }
  })
}));

import {
  PROJECT,
  postRoute,
  readProjectRoutes,
  renderPage,
  route,
  saveApiRequest,
  scanResult
} from "./harness";

function tabBar() {
  return screen.getByRole("tablist");
}

function tabNames() {
  return within(tabBar())
    .getAllByRole("tab")
    .map((tab) => tab.textContent ?? "");
}

async function openBothRoutes() {
  readProjectRoutes.mockResolvedValue(scanResult({ routes: [route(), postRoute()] }));
  renderPage();

  await userEvent.click(await screen.findByText("/users/{id}"));
  await userEvent.click(screen.getByText("/users"));
}

describe("working in more than one request at a time", () => {
  it("opens a tab per request and keeps the last one in front", async () => {
    await openBothRoutes();

    expect(tabNames()).toEqual([
      expect.stringContaining("/users/{id}"),
      expect.stringContaining("/users")
    ]);
    expect(
      within(tabBar())
        .getAllByRole("tab")
        .map((tab) => tab.getAttribute("aria-selected"))
    ).toEqual(["false", "true"]);
  });

  it("opens the request a tab was already holding instead of a second one", async () => {
    await openBothRoutes();

    await userEvent.click(screen.getAllByText("/users/{id}")[0]);

    expect(tabNames()).toHaveLength(2);
  });

  it("goes back to a request by its tab, with what was typed into it", async () => {
    await openBothRoutes();

    await userEvent.click(within(tabBar()).getAllByRole("tab")[0]);
    await userEvent.type(screen.getByLabelText(/^id/), "42");
    await userEvent.click(within(tabBar()).getAllByRole("tab")[1]);

    expect(screen.queryByLabelText(/^id/)).toBeNull();

    await userEvent.click(within(tabBar()).getAllByRole("tab")[0]);

    expect(screen.getByLabelText(/^id/)).toHaveProperty("value", "42");
  });

  it("closes a tab and shows the one beside it", async () => {
    await openBothRoutes();

    await userEvent.click(within(tabBar()).getAllByRole("button", { name: /close_tab/i })[1]);

    expect(tabNames()).toEqual([expect.stringContaining("/users/{id}")]);
    expect(within(tabBar()).getByRole("tab").getAttribute("aria-selected")).toBe("true");
  });

  it("clears every tab at once", async () => {
    await openBothRoutes();

    expect(tabNames()).toHaveLength(2);

    await userEvent.click(screen.getByRole("button", { name: /api_studio\.close_all_tabs/i }));

    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByText(/api_studio\.select_route_title/i)).toBeTruthy();
  });

  it("marks a request that has changes still to write, and writes them on demand", async () => {
    readProjectRoutes.mockResolvedValue(scanResult());
    renderPage();

    await userEvent.click(await screen.findByText("/users/{id}"));

    expect(screen.getByRole("button", { name: /api_studio\.saved$/i })).toHaveProperty(
      "disabled",
      true
    );

    await userEvent.type(screen.getByLabelText(/^id/), "42");

    const save = await screen.findByRole("button", { name: /api_studio\.save$/i });

    expect(within(tabBar()).getByLabelText(/unsaved_changes/i)).toBeTruthy();

    await userEvent.click(save);

    await waitFor(() =>
      expect(saveApiRequest).toHaveBeenCalledWith(
        PROJECT,
        "route_1",
        expect.objectContaining({ fields: { "path:id": "42" } })
      )
    );
    expect(screen.getByRole("button", { name: /api_studio\.saved$/i })).toBeTruthy();
  });

  it("writes what is pending when the reader moves to another tab", async () => {
    await openBothRoutes();

    await userEvent.click(within(tabBar()).getAllByRole("tab")[0]);
    await userEvent.type(screen.getByLabelText(/^id/), "7");
    await userEvent.click(within(tabBar()).getAllByRole("tab")[1]);

    await waitFor(() =>
      expect(saveApiRequest).toHaveBeenCalledWith(
        PROJECT,
        "route_1",
        expect.objectContaining({ fields: { "path:id": "7" } })
      )
    );
  });
});
