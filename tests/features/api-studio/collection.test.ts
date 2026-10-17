// @vitest-environment jsdom

import { screen, waitFor, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useParams, useSearchParams } from "react-router-dom";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "en", language: "en" }
  })
}));

import { ApiStudioPage, PROJECT, project, readProjectRoutes, readRouteDetails, renderPage, route, scanProjectRoutes, scanResult } from "./harness";

describe("the route collection API Studio builds", () => {
  it("reads a route's details again once the project has been rescanned", async () => {
    readProjectRoutes.mockResolvedValue(scanResult());
    readRouteDetails.mockResolvedValue([
      { id: "route_1", description: null, parameters: [], requestBody: null, responses: [] }
    ]);
    scanProjectRoutes.mockResolvedValue(
      scanResult({ scannedAt: "2026-08-20T10:00:00.000Z" })
    );
    renderPage();

    await userEvent.click(await screen.findByText("/users/{id}"));
    await waitFor(() => expect(readRouteDetails).toHaveBeenCalledTimes(1));

    readRouteDetails.mockResolvedValue([
      {
        id: "route_1",
        description: null,
        parameters: [
          {
            name: "tenant",
            location: "query",
            required: false,
            description: null,
            schemaType: "string",
            example: null
          }
        ],
        requestBody: null,
        responses: []
      }
    ]);

    await userEvent.click(screen.getByRole("button", { name: /scan_routes/i }));

    await waitFor(() => expect(readRouteDetails).toHaveBeenCalledTimes(2));

    expect(await screen.findByText("tenant")).toBeTruthy();
  });

  it("asks main to scan the open project and lists what came back", async () => {
    scanProjectRoutes.mockResolvedValue(scanResult());
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: /scan_routes/i }));

    await waitFor(() => expect(scanProjectRoutes).toHaveBeenCalledWith(PROJECT));
    expect(await screen.findByText("/users/{id}")).toBeTruthy();
    expect(screen.getByText("Fetch a user")).toBeTruthy();
  });

  it("opens the route a user picks, with its parameters and source", async () => {
    scanProjectRoutes.mockResolvedValue(scanResult());
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: /scan_routes/i }));
    await userEvent.click((await screen.findByText("/users/{id}")).closest("button")!);

    expect(screen.getByText("openapi.yaml:14")).toBeTruthy();
    expect(screen.getByText("The user id")).toBeTruthy();
    // The base URL comes from the open environment, not the route's own server.
    expect(screen.getByText("http://localhost:5000")).toBeTruthy();
  });

  it("groups routes in collapsible folders without a leading slash", async () => {
    scanProjectRoutes.mockResolvedValue(scanResult());
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: /scan_routes/i }));
    const folder = await screen.findByText("users");

    expect(screen.queryByText("/users")).toBeNull();
    await userEvent.click(folder.closest("button")!);
    expect(screen.queryByText("/users/{id}")).toBeNull();
  });

  it("collapses every route folder from the collection header", async () => {
    scanProjectRoutes.mockResolvedValue(scanResult());
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: /scan_routes/i }));
    await screen.findByText("/users/{id}");
    await userEvent.click(
      screen.getByRole("button", { name: /project_tree\.collapse_all/i })
    );

    expect(screen.queryByText("/users/{id}")).toBeNull();
  });

  it("opens a saved collection without asking for a scan", async () => {
    readProjectRoutes.mockResolvedValue(scanResult());
    renderPage();

    expect(await screen.findByText("/users/{id}")).toBeTruthy();
    await waitFor(() => expect(readProjectRoutes).toHaveBeenCalledWith(PROJECT));
    expect(scanProjectRoutes).not.toHaveBeenCalled();
  });

  it("replaces the saved collection when a rescan finishes", async () => {
    readProjectRoutes.mockResolvedValue(scanResult());
    scanProjectRoutes.mockResolvedValue(
      scanResult({ routes: [route({ id: "route_2", path: "/orders", summary: "List orders" })] })
    );
    renderPage();

    expect(await screen.findByText("/users/{id}")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /scan_routes/i }));

    expect(await screen.findByText("/orders")).toBeTruthy();
    expect(screen.queryByText("/users/{id}")).toBeNull();
  });

  it("opens the file a route came from, in the workspace, at its line", async () => {
    readProjectRoutes.mockResolvedValue(scanResult());

    function WorkspaceProbe() {
      const { projectPath } = useParams<{ projectPath: string }>();
      const [params] = useSearchParams();

      return createElement(
        "p",
        null,
        `opened ${decodeURIComponent(projectPath ?? "")} at ${params.get("file")}:${params.get("line")}`
      );
    }

    render(
      createElement(
        MemoryRouter,
        { initialEntries: ["/tools/api-studio"] },
        createElement(
          Routes,
          null,
          createElement(Route, {
            path: "/tools/api-studio",
            element: createElement(ApiStudioPage, {
              projects: [project],
              activeProjectPath: PROJECT,
              onActiveProjectChange: vi.fn(),
              onSyncProject: vi.fn().mockResolvedValue(project)
            })
          }),
          createElement(Route, {
            path: "/workspace/project/:projectPath",
            element: createElement(WorkspaceProbe)
          })
        )
      )
    );

    await userEvent.click(await screen.findByText("/users/{id}"));
    await userEvent.click(screen.getByRole("button", { name: /openapi\.yaml:14/ }));

    expect(await screen.findByText(`opened ${PROJECT} at openapi.yaml:14`)).toBeTruthy();
  });

  it("shows scan failures instead of an empty collection", async () => {
    scanProjectRoutes.mockRejectedValue(new Error("That project folder no longer exists."));
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: /scan_routes/i }));

    expect(await screen.findByText("That project folder no longer exists.")).toBeTruthy();
  });

  it("keeps constructs the scanner could not resolve visible", async () => {
    scanProjectRoutes.mockResolvedValue(
      scanResult({
        routes: [],
        unsupported: [
          {
            scanner: "openapi",
            reason: "/webhook points at an external document, which is not read yet.",
            filePath: "openapi.yaml",
            line: 79
          }
        ]
      })
    );
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: /scan_routes/i }));

    expect(
      await screen.findByText("/webhook points at an external document, which is not read yet.")
    ).toBeTruthy();
    expect(screen.getByText("openapi.yaml:79")).toBeTruthy();
  });
});
