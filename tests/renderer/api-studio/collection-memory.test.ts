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

import { PROJECT, postRoute, readApiCollectionBody, readApiCollections, readProjectRoutes, renderPage, responseBody, route, saveApiRequest, scanResult } from "./harness";
import { openCustom, pickFirstRoute, pickMenuItem, rowMenu, rowOptions, savedCollections, withCollection } from "./collection-harness";

describe("what a collection keeps of its own", () => {
  it("reads what the app kept for this project", async () => {
    readApiCollections.mockResolvedValue([
      {
        id: "collection-1",
        name: "Kept",
        folders: [],
        requests: [
          {
            id: "request-1",
            name: "Fetch a user",
            routeId: "route_1",
            route: route(),
            draft: null,
            examples: []
          }
        ]
      }
    ]);
    readProjectRoutes.mockResolvedValue(scanResult());
    renderPage();
    await openCustom();

    expect(readApiCollections).toHaveBeenCalledWith(PROJECT);
    expect(screen.getByText("Kept")).toBeTruthy();
  });

  it("gives a custom request its own memory, not the project's", async () => {
    readApiCollections.mockResolvedValue([
      {
        id: "collection-1",
        name: "Kept",
        folders: [],
        requests: [
          {
            id: "request-1",
            name: "Create a user",
            routeId: "route_2",
            route: postRoute(),
            draft: null,
            examples: []
          }
        ]
      }
    ]);
    readProjectRoutes.mockResolvedValue(scanResult());
    renderPage();
    await openCustom();

    await userEvent.click(await screen.findByText("Kept"));
    await userEvent.click(await screen.findByText("Create a user"));
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.body/i }));
    await userEvent.type(screen.getByLabelText(/api_studio\.body/i), "!");

    await waitFor(() =>
      expect(savedCollections()).toEqual([
        expect.objectContaining({
          requests: [
            expect.objectContaining({
              id: "request-1",
              draft: expect.objectContaining({ json: expect.stringContaining("!") })
            })
          ]
        })
      ])
    );
    expect(saveApiRequest).not.toHaveBeenCalled();
  });

  it("keeps a response as an example under the request it came from", async () => {
    await withCollection();

    await rowMenu("api_studio.new_collection_name");
    await pickMenuItem(/api_studio\.pick_requests/i);
    await pickFirstRoute();
    await userEvent.click(await screen.findByText("Fetch a user"));
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));

    await screen.findByText("200 OK");

    await userEvent.click(screen.getByRole("button", { name: /api_studio\.save_response/i }));

    await waitFor(() =>
      expect(savedCollections()[0].requests[0].examples).toEqual([
        expect.objectContaining({ name: "200 OK", body: '{"id":"42"}' })
      ])
    );

    const tree = screen
      .getByRole("button", { name: rowOptions("api_studio.new_collection_name") })
      .closest("li")!;

    expect(within(tree).getAllByText("200 OK").length).toBeGreaterThan(0);
  });

  it("shows an example the tree was asked for", async () => {
    readApiCollectionBody.mockResolvedValue('{"id":"kept"}');
    readApiCollections.mockResolvedValue([
      {
        id: "collection-1",
        name: "Kept",
        folders: [],
        requests: [
          {
            id: "request-1",
            name: "Fetch a user",
            routeId: "route_1",
            route: route(),
            draft: {
              mode: "json",
              json: "",
              entries: [],
              fields: {},
              scripts: { pre: "", post: "" },
              savedAt: "2026-08-20T09:00:00.000Z"
            },
            examples: [
              {
                id: "example-1",
                name: "200 OK",
                status: 200,
                statusText: "OK",
                durationMs: 12,
                headers: [],
                mediaType: "application/json",
                body: "",
                bodyFile: "abc-example-1.txt",
                bodyBytes: 13,
                truncated: false,
                receivedAt: "2026-08-20T09:00:00.000Z"
              }
            ]
          }
        ]
      }
    ]);
    readProjectRoutes.mockResolvedValue(scanResult());
    renderPage();
    await openCustom();

    await userEvent.click(await screen.findByText("Kept"));
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.examples/i }));
    await userEvent.click(await screen.findByText("200 OK"));

    await waitFor(() => expect(responseBody()).toContain("kept"));
    expect(readApiCollectionBody).toHaveBeenCalledWith(PROJECT, "abc-example-1.txt");
    expect(screen.getByText(/api_studio\.example_read_only/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /api_studio\.send$/i })).toBeNull();
  });
});
