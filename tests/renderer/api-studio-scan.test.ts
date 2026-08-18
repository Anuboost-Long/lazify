// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiStudioPage } from "../../src/renderer/features/api-studio/pages/ApiStudioPage";
import type {
  SavedRoute,
  SavedRouteScan
} from "../../src/renderer/features/api-studio/types";
import type { SyncedWorkspaceProject } from "../../src/renderer/shared/types/lazify";

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "en", language: "en" }
  })
}));

const PROJECT = "/workspace/demo";

const project = {
  projectPath: PROJECT,
  projectName: "demo"
} as SyncedWorkspaceProject;

function route(over: Partial<SavedRoute> = {}): SavedRoute {
  return {
    id: "route_1",
    firstSeenAt: "2026-08-18T09:30:00.000Z",
    folder: "users",
    method: "GET",
    path: "/users/{id}",
    summary: "Fetch a user",
    description: null,
    operationId: "getUser",
    tags: [],
    servers: ["http://localhost:3000"],
    source: {
      kind: "openapi",
      filePath: "openapi.yaml",
      line: 14,
      adapter: "openapi",
      confidence: "exact"
    },
    parameters: [
      {
        name: "id",
        location: "path",
        required: true,
        description: "The user id",
        schemaType: "string",
        example: null
      }
    ],
    headers: [],
    requestBody: null,
    responses: [{ status: "200", description: "The user", mediaTypes: ["application/json"] }],
    security: [],
    ...over
  };
}

function scanResult(over: Partial<SavedRouteScan> = {}): SavedRouteScan {
  return {
    version: 1,
    projectPath: PROJECT,
    createdAt: "2026-08-18T09:30:00.000Z",
    scannedAt: "2026-08-18T09:30:00.000Z",
    routes: [route()],
    warnings: [],
    unsupported: [],
    filesInspected: 1,
    scannersRun: ["openapi"],
    durationMs: 12,
    ...over
  };
}

class StubResizeObserver {
  observe() {}
  disconnect() {}
}

const scanProjectRoutes = vi.fn();
const readProjectRoutes = vi.fn();
const readRouteDetails = vi.fn();
const readApiEnvironments = vi.fn();
const saveApiEnvironments = vi.fn();

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", StubResizeObserver);
  scanProjectRoutes.mockReset();
  readProjectRoutes.mockReset();
  readRouteDetails.mockReset();
  readRouteDetails.mockResolvedValue([]);
  readApiEnvironments.mockReset();
  saveApiEnvironments.mockReset();
  readProjectRoutes.mockResolvedValue(null);
  readApiEnvironments.mockResolvedValue({
    activeId: "local",
    environments: [
      { id: "local", name: "Local", values: { baseUrl: "http://localhost:5000" } },
      { id: "staging", name: "Staging", values: { baseUrl: "https://staging.example.com" } }
    ]
  });
  saveApiEnvironments.mockImplementation((_project: string, set: unknown) => Promise.resolve(set));
  Object.defineProperty(globalThis, "lazify", {
    configurable: true,
    value: {
      scanProjectRoutes,
      readProjectRoutes,
      readRouteDetails,
      readApiEnvironments,
      saveApiEnvironments
    }
  });
});

afterEach(() => cleanup());

function renderPage() {
  return render(
    createElement(ApiStudioPage, {
      projects: [project],
      activeProjectPath: PROJECT,
      onActiveProjectChange: vi.fn(),
      onSyncProject: vi.fn().mockResolvedValue(project)
    })
  );
}

describe("API Studio scanning", () => {
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

  it("sends the request to whichever environment is chosen", async () => {
    readProjectRoutes.mockResolvedValue(scanResult());
    renderPage();

    await userEvent.click(await screen.findByText("/users/{id}"));
    expect(await screen.findByText("http://localhost:5000")).toBeTruthy();

    await userEvent.selectOptions(screen.getByRole("combobox"), "staging");

    expect(await screen.findByText("https://staging.example.com")).toBeTruthy();
    await waitFor(() =>
      expect(saveApiEnvironments).toHaveBeenCalledWith(
        PROJECT,
        expect.objectContaining({ activeId: "staging" }),
        expect.any(Array)
      )
    );
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
