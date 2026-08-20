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
  responseBody,
  saveApiRequest,
  scanResult
} from "./harness";

async function saveTheResponse() {
  readProjectRoutes.mockResolvedValue(scanResult());
  renderPage();

  await userEvent.click(await screen.findByText("/users/{id}"));
  await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));
  await screen.findByText("200 OK");
  await userEvent.click(screen.getByRole("button", { name: /api_studio\.save_response/i }));

  return screen.findByRole("button", { name: /^200 OK$/ });
}

describe("a response kept as an example", () => {
  it("sits under the request it came from", async () => {
    const kept = await saveTheResponse();

    const routeRow = kept.closest("li")!.parentElement!.closest("li")!;

    expect(routeRow.textContent).toContain("/users/{id}");
    await waitFor(() =>
      expect(saveApiRequest).toHaveBeenCalledWith(
        PROJECT,
        "route_1",
        expect.objectContaining({ examples: [expect.objectContaining({ name: "200 OK" })] })
      )
    );
  });

  it("opens read only, with nothing of the live request in it", async () => {
    const kept = await saveTheResponse();

    await userEvent.click(kept);

    expect(screen.getByText(/api_studio\.example_read_only/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /api_studio\.send$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /api_studio\.save_response/i })).toBeNull();
    expect(responseBody()).toContain('"id": "42"');
  });

  it("holds the request that produced it, whole", async () => {
    readProjectRoutes.mockResolvedValue(scanResult({ routes: [postRoute()] }));
    renderPage();

    await userEvent.click(await screen.findByText("/users"));
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.body/i }));
    await userEvent.clear(screen.getByLabelText(/api_studio\.body/i));
    await userEvent.type(screen.getByLabelText(/api_studio\.body/i), '{{"name":"Ada"}');
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));
    await screen.findByText("200 OK");
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.save_response/i }));

    await waitFor(() =>
      expect(saveApiRequest).toHaveBeenCalledWith(
        PROJECT,
        "route_2",
        expect.objectContaining({
          examples: [
            expect.objectContaining({
              request: expect.objectContaining({
                method: "POST",
                url: "http://localhost:5000/users",
                body: '{"name":"Ada"}'
              })
            })
          ]
        })
      )
    );

    await userEvent.click(await screen.findByRole("button", { name: /^200 OK$/ }));

    expect(screen.getByRole("button", { name: /api_studio\.params/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /api_studio\.reset_body/i })).toBeNull();

    await userEvent.click(screen.getAllByRole("button", { name: /api_studio\.body/i })[0]);

    expect(screen.getAllByLabelText(/api_studio\.body/i)[0].textContent).toContain('"name"');
  });

  it("shows the request the way the workspace does, without letting it be changed", async () => {
    readProjectRoutes.mockResolvedValue(scanResult());
    renderPage();

    await userEvent.click(await screen.findByText("/users/{id}"));
    await userEvent.type(screen.getByLabelText(/^id/), "42");
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));
    await screen.findByText("200 OK");
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.save_response/i }));
    await userEvent.click(await screen.findByRole("button", { name: /^200 OK$/ }));

    const field = screen.getByLabelText(/^id/);

    expect(field).toHaveProperty("value", "42");
    expect(field).toHaveProperty("readOnly", true);

    await userEvent.type(field, "9");

    expect(field).toHaveProperty("value", "42");
  });

  it("opens as a tab of its own, beside the request", async () => {
    const kept = await saveTheResponse();

    await userEvent.click(kept);

    const tabs = within(screen.getByRole("tablist")).getAllByRole("tab");

    expect(tabs.map((tab) => tab.textContent)).toEqual([
      expect.stringContaining("/users/{id}"),
      expect.stringContaining("200 OK")
    ]);
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
  });

  it("goes when it is taken out of the tree, and takes its tab with it", async () => {
    const kept = await saveTheResponse();

    await userEvent.click(kept);
    await userEvent.click(
      await screen.findByRole("button", { name: /api_studio\.row_options 200 OK/i })
    );
    await userEvent.click(
      await screen.findByRole("menuitem", { name: /api_studio\.remove_example/i })
    );

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /^200 OK$/ })).toBeNull()
    );
    expect(within(screen.getByRole("tablist")).getAllByRole("tab")).toHaveLength(1);
    await waitFor(() =>
      expect(saveApiRequest).toHaveBeenLastCalledWith(
        PROJECT,
        "route_1",
        expect.objectContaining({ examples: [] })
      )
    );
  });
});
