import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, vi } from "vitest";

import { ApiStudioPage } from "../../../src/renderer/features/api-studio/pages/ApiStudioPage";
import type { DocState } from "../../../src/main/api-studio/docs/types";
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

export function stubDataTransfer() {
  const carried = new Map<string, string>();

  return {
    effectAllowed: "none",
    dropEffect: "none",
    setData: (format: string, value: string) => {
      carried.set(format, value);
    },
    getData: (format: string) => carried.get(format) ?? ""
  };
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
export const readCollectionDoc = vi.fn();
export const saveCollectionDoc = vi.fn();
export const previewCollectionDoc = vi.fn();
export const openCollectionDoc = vi.fn();
export const exportCollectionDoc = vi.fn();
export const collectionDocBrief = vi.fn();
export const writeCollectionDocBrief = vi.fn();
export const importCollectionDocDraft = vi.fn();
export const chooseDocLogo = vi.fn();
export const collectionDocQuestions = vi.fn();
export const watchCollectionDocDraft = vi.fn();
export const unwatchCollectionDocDraft = vi.fn();
export const ptyWrite = vi.fn();
export const stopScript = vi.fn();
export const ptyResize = vi.fn();
export const saveClipboardImage = vi.fn();
let draftListener: ((collectionId: string) => void) | null = null;
let ptyListeners: Array<(event: { runId: string; data: string }) => void> = [];

/** Stands in for the pty printing its first output, which means "ready". */
export function ptyData(runId: string, data = "ready") {
  for (const listener of ptyListeners) listener({ runId, data });
}

/** Stands in for the main process telling the renderer a draft file changed. */
export function draftChanged(collectionId: string) {
  draftListener?.(collectionId);
}
export const listAgents = vi.fn();
export const listAgentSessions = vi.fn();
export const listSessions = vi.fn();
export const listScripts = vi.fn();
export const openAgentTerminal = vi.fn();
export const addCustomAgent = vi.fn();
export const removeCustomAgent = vi.fn();
const noopSubscription = () => () => undefined;

export function docState(over: Partial<DocState> = {}): DocState {
  return {
    doc: {
      collectionId: "collection-1",
      title: "Kept",
      subtitle: "",
      version: "",
      baseUrl: "",
      presetId: "reference",
      sections: {},
      folders: [],
      routes: [
        {
          requestId: "request-1",
          title: "Fetch a user",
          folderId: "",
          folder: "",
          sections: {},
          writtenBy: "detected",
          updatedAt: "2026-08-20T09:00:00.000Z"
        }
      ],
      theme: {
        accent: "#2f6feb",
        logo: "",
        pageSize: "A4",
        margin: "normal",
        cover: true,
        contents: true,
        curl: true,
        examples: true,
        darkCode: false
      },
      updatedAt: "2026-08-20T09:00:00.000Z"
    },
    gaps: [
      {
        requestId: null,
        sectionId: "overview",
        where: "Kept",
        question: "What is this API for, and who calls it?"
      }
    ],
    ...over
  };
}

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
  readCollectionDoc.mockReset();
  readCollectionDoc.mockResolvedValue(docState());
  saveCollectionDoc.mockReset();
  saveCollectionDoc.mockImplementation((_project: string, doc: unknown) =>
    Promise.resolve({ doc, gaps: [] })
  );
  previewCollectionDoc.mockReset();
  previewCollectionDoc.mockResolvedValue("<!doctype html><html><body>Kept</body></html>");
  openCollectionDoc.mockReset();
  openCollectionDoc.mockResolvedValue(null);
  exportCollectionDoc.mockReset();
  exportCollectionDoc.mockResolvedValue({ filePath: "/tmp/kept.pdf", format: "pdf", routes: 1 });
  collectionDocBrief.mockReset();
  collectionDocBrief.mockResolvedValue({
    presetId: "reference",
    instructions: "Read doc-job.json",
    job: "{}",
    gaps: []
  });
  writeCollectionDocBrief.mockReset();
  writeCollectionDocBrief.mockResolvedValue({
    directory: "/workspace/demo/.lazify/api-studio/docs/kept",
    instructionsPath: "/workspace/demo/.lazify/api-studio/docs/kept/doc-brief.md",
    jobPath: "/workspace/demo/.lazify/api-studio/docs/kept/doc-job.json",
    answerPath: "/workspace/demo/.lazify/api-studio/docs/kept/doc-draft.json"
  });
  importCollectionDocDraft.mockReset();
  chooseDocLogo.mockReset();
  chooseDocLogo.mockResolvedValue("data:image/png;base64,iVBORw0KGgo=");
  collectionDocQuestions.mockReset();
  collectionDocQuestions.mockResolvedValue("Answer these questions");
  watchCollectionDocDraft.mockReset();
  watchCollectionDocDraft.mockResolvedValue(true);
  unwatchCollectionDocDraft.mockReset();
  unwatchCollectionDocDraft.mockResolvedValue(undefined);
  ptyWrite.mockReset();
  stopScript.mockReset();
  stopScript.mockResolvedValue(undefined);
  ptyResize.mockReset();
  saveClipboardImage.mockReset();
  draftListener = null;
  ptyListeners = [];
  listAgents.mockReset();
  listAgents.mockResolvedValue([
    { id: "claude", label: "Claude", command: "claude", available: true, isCustom: false }
  ]);
  listAgentSessions.mockReset();
  listAgentSessions.mockResolvedValue([]);
  listSessions.mockReset();
  listSessions.mockResolvedValue([]);
  listScripts.mockReset();
  listScripts.mockResolvedValue([]);
  openAgentTerminal.mockReset();
  openAgentTerminal.mockResolvedValue({ runId: "run-1" });
  addCustomAgent.mockReset();
  removeCustomAgent.mockReset();
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
      chooseUploadFile,
      readCollectionDoc,
      saveCollectionDoc,
      previewCollectionDoc,
      openCollectionDoc,
      exportCollectionDoc,
      collectionDocBrief,
      writeCollectionDocBrief,
      importCollectionDocDraft,
      chooseDocLogo,
      collectionDocQuestions,
      watchCollectionDocDraft,
      unwatchCollectionDocDraft,
      onCollectionDocDraftChanged: (callback: (collectionId: string) => void) => {
        draftListener = callback;

        return () => {
          draftListener = null;
  ptyListeners = [];
        };
      },
      ptyWrite,
      ptyResize,
      saveClipboardImage,
      listAgents,
      listAgentSessions,
      listSessions,
      listScripts,
      openAgentTerminal,
      addCustomAgent,
      removeCustomAgent,
      onAgentAttention: noopSubscription,
      onScriptStatus: noopSubscription,
      onSessionKilled: noopSubscription,
      onPtyData: (callback: (event: { runId: string; data: string }) => void) => {
        ptyListeners = [...ptyListeners, callback];

        return () => {
          ptyListeners = ptyListeners.filter((held) => held !== callback);
        };
      },
      stopScript: stopScript
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
