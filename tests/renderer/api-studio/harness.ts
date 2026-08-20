import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, vi } from "vitest";

import { ApiStudioPage } from "../../../src/renderer/features/api-studio/pages/ApiStudioPage";
import type { SavedRoute, SavedRouteScan } from "../../../src/renderer/features/api-studio/types";
import type { SyncedWorkspaceProject } from "../../../src/renderer/shared/types/lazify";

export { ApiStudioPage };

export const PROJECT = "/workspace/demo";

export const project = {
  projectPath: PROJECT,
  projectName: "demo"
} as SyncedWorkspaceProject;

export function route(over: Partial<SavedRoute> = {}): SavedRoute {
  return {
    id: "route_1",
    workspace: "",
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
    responses: [
      {
        status: "200",
        description: "The user",
        mediaTypes: ["application/json"],
        example: null
      }
    ],
    security: [],
    ...over
  };
}

export const SCHEMA_BODY = '{\n  "name": "string",\n  "age": 0\n}';

export function postRoute(): SavedRoute {
  return route({
    id: "route_2",
    method: "POST",
    path: "/users",
    summary: "Create a user",
    parameters: [],
    requestBody: {
      required: true,
      description: null,
      variants: [
        {
          mediaType: "application/json",
          schemaType: "User",
          example: null,
          defaultBody: SCHEMA_BODY
        }
      ]
    }
  });
}

export function scanResult(over: Partial<SavedRouteScan> = {}): SavedRouteScan {
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

export class StubResizeObserver {
  observe() {}
  disconnect() {}
}

export const scanProjectRoutes = vi.fn();
export const readProjectRoutes = vi.fn();
export const readRouteDetails = vi.fn();
export const readApiEnvironments = vi.fn();
export const saveApiEnvironments = vi.fn();
export const sendApiRequest = vi.fn();
export const runApiRequest = vi.fn();
export const readAllowedHosts = vi.fn();
export const allowApiHost = vi.fn();
export const forgetApiHost = vi.fn();
export const readScriptSettings = vi.fn();
export const saveScriptSettings = vi.fn();
export const readApiRequests = vi.fn();
export const saveApiRequest = vi.fn();
export const forgetApiRequest = vi.fn();
export const setApiRequestStorage = vi.fn();
export const readApiResponseBody = vi.fn();
export const readApiCollections = vi.fn();
export const readApiCollectionBody = vi.fn();
export const saveApiCollections = vi.fn();
export const exportPostmanCollection = vi.fn();
export const exportCustomCollection = vi.fn();
export const saveResponseFile = vi.fn();
export const openResponseFile = vi.fn();
export const chooseUploadFile = vi.fn();

beforeEach(() => {
  globalThis.localStorage.clear();
  vi.stubGlobal("ResizeObserver", StubResizeObserver);
  scanProjectRoutes.mockReset();
  readProjectRoutes.mockReset();
  readRouteDetails.mockReset();
  readRouteDetails.mockResolvedValue([]);
  readApiEnvironments.mockReset();
  saveApiEnvironments.mockReset();
  sendApiRequest.mockReset();
  runApiRequest.mockReset();
  readAllowedHosts.mockReset();
  readAllowedHosts.mockResolvedValue([]);
  allowApiHost.mockReset();
  allowApiHost.mockImplementation((_project: string, url: string) =>
    Promise.resolve([new URL(url).host])
  );
  forgetApiHost.mockReset();
  forgetApiHost.mockResolvedValue([]);
  readScriptSettings.mockReset();
  readScriptSettings.mockResolvedValue({ global: "lz" });
  saveScriptSettings.mockReset();
  saveScriptSettings.mockImplementation((_project: string, settings: unknown) =>
    Promise.resolve(settings)
  );
  runApiRequest.mockImplementation(async (input: { draft: unknown }) => ({
    outcome: await sendApiRequest(input.draft),
    pre: null,
    post: null,
    changedValues: null
  }));
  readApiRequests.mockReset();
  readApiRequests.mockResolvedValue({ location: "app", requests: {} });
  saveApiRequest.mockReset();
  saveApiRequest.mockResolvedValue({ location: "app", requests: {} });
  forgetApiRequest.mockReset();
  forgetApiRequest.mockResolvedValue({ location: "app", requests: {} });
  setApiRequestStorage.mockReset();
  readApiResponseBody.mockReset();
  readApiResponseBody.mockResolvedValue("");
  readApiCollections.mockReset();
  readApiCollections.mockResolvedValue([]);
  readApiCollectionBody.mockReset();
  readApiCollectionBody.mockResolvedValue("");
  saveApiCollections.mockReset();
  saveApiCollections.mockImplementation((_project: string, collections: unknown) =>
    Promise.resolve(collections)
  );
  exportPostmanCollection.mockReset();
  exportPostmanCollection.mockResolvedValue({ filePath: "/tmp/demo.json", routes: 1 });
  exportCustomCollection.mockReset();
  exportCustomCollection.mockResolvedValue({ filePath: "/tmp/kept.json", routes: 1 });
  saveResponseFile.mockReset();
  saveResponseFile.mockResolvedValue("/Users/ada/Downloads/policy.pdf");
  openResponseFile.mockReset();
  openResponseFile.mockResolvedValue(null);
  chooseUploadFile.mockReset();
  chooseUploadFile.mockResolvedValue("/Users/ada/Pictures/avatar.png");
  setApiRequestStorage.mockResolvedValue({ location: "project", requests: {} });
  sendApiRequest.mockResolvedValue({
    ok: true,
    response: {
      status: 200,
      statusText: "OK",
      durationMs: 18,
      headers: [{ name: "content-type", value: "application/json" }],
      mediaType: "application/json",
      body: '{"id":"42"}',
      bodyBytes: 11,
      truncated: false
    }
  });
  readProjectRoutes.mockResolvedValue(null);
  readApiEnvironments.mockResolvedValue({
    activeId: "local",
    variables: [],
    names: {},
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
      saveApiEnvironments,
      sendApiRequest,
      runApiRequest,
      readAllowedHosts,
      allowApiHost,
      forgetApiHost,
      readScriptSettings,
      saveScriptSettings,
      readApiRequests,
      saveApiRequest,
      forgetApiRequest,
      setApiRequestStorage,
      readApiResponseBody,
      readApiCollections,
      readApiCollectionBody,
      saveApiCollections,
      exportPostmanCollection,
      exportCustomCollection,
      saveResponseFile,
      openResponseFile,
      chooseUploadFile
    }
  });
});

afterEach(() => cleanup());

/** The body is syntax-highlighted, so it is read off the surface as a whole. */
export function responseBody() {
  return screen.getByLabelText(/api_studio\.response/i).textContent ?? "";
}

export function renderPage() {
  return render(
    createElement(
      MemoryRouter,
      null,
      createElement(ApiStudioPage, {
        projects: [project],
        activeProjectPath: PROJECT,
        onActiveProjectChange: vi.fn(),
        onSyncProject: vi.fn().mockResolvedValue(project)
      })
    )
  );
}
