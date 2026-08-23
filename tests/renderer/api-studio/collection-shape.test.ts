// @vitest-environment jsdom

import { fireEvent, screen, waitFor } from "@testing-library/react";
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
  postRoute,
  readApiCollections,
  readProjectRoutes,
  renderPage,
  route,
  scanResult,
  stubDataTransfer
} from "./harness";
import { openCustom, pickFirstRoute, pickMenuItem, rowMenu, savedCollections, withCollection } from "./collection-harness";

describe("the shape of the collection tree", () => {
  it("puts a request where it was dragged", async () => {
    readApiCollections.mockResolvedValue([
      {
        id: "collection-1",
        name: "Kept",
        folders: [],
        requests: [
          {
            id: "request-1",
            name: "First",
            routeId: "route_1",
            route: route(),
            draft: null,
            examples: []
          },
          {
            id: "request-2",
            name: "Second",
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

    const first = (await screen.findByText("First")).closest("div")!;
    const second = screen.getByText("Second").closest("div")!;

    const dataTransfer = stubDataTransfer();

    fireEvent.dragStart(second, { dataTransfer });
    fireEvent.dragOver(first, { dataTransfer });
    fireEvent.drop(first, { dataTransfer });

    await waitFor(() =>
      expect(savedCollections()[0].requests.map((entry: { name: string }) => entry.name)).toEqual([
        "Second",
        "First"
      ])
    );
  });

  it("folds the whole collection away, and the button rests once it is folded", async () => {
    await withCollection();

    await rowMenu("api_studio.new_collection_name");
    await pickMenuItem(/api_studio\.new_folder/i);
    await rowMenu("api_studio.new_collection_name");
    await pickMenuItem(/api_studio\.pick_requests/i);
    await pickFirstRoute();

    expect(screen.getByText("api_studio.new_folder_name")).toBeTruthy();
    expect(screen.getByText("Fetch a user")).toBeTruthy();

    const collapse = screen.getByRole("button", { name: /project_tree\.collapse_all/i });

    await userEvent.click(collapse);

    expect(screen.queryByText("api_studio.new_folder_name")).toBeNull();
    expect(screen.queryByText("Fetch a user")).toBeNull();
    expect(screen.getByText("api_studio.new_collection_name")).toBeTruthy();
    expect(collapse).toHaveProperty("disabled", true);
  });

  it("keeps every collection folded until the user opens one, and remembers it", async () => {
    readApiCollections.mockResolvedValue([
      {
        id: "collection-1",
        name: "Kept",
        folders: [{ id: "folder-1", name: "Auth", requests: [] }],
        requests: []
      }
    ]);
    readProjectRoutes.mockResolvedValue(scanResult());

    const first = renderPage();

    await openCustom();

    expect(await screen.findByText("Kept")).toBeTruthy();
    expect(screen.queryByText("Auth")).toBeNull();

    await userEvent.click(screen.getByText("Kept"));

    expect(screen.getByText("Auth")).toBeTruthy();

    first.unmount();

    renderPage();
    await openCustom();

    expect(await screen.findByText("Auth")).toBeTruthy();
  });
});
