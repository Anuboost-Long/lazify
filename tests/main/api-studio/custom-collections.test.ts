import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-api-collections-"));

vi.mock("electron", () => ({ app: { getPath: () => userDataPath } }));

const { readCollectionBody, readCustomCollections, saveCustomCollections } = await import(
  "../../../src/main/api-studio/custom-collections"
);
type CustomCollection = import("../../../src/main/api-studio/custom-collections").CustomCollection;
type CustomRequest = import("../../../src/main/api-studio/custom-collections").CustomRequest;

const PROJECT = "/workspace/demo";
const OTHER_PROJECT = "/workspace/other";

function storeFile() {
  return path.join(userDataPath, "api-studio-collections.json");
}

function bodyFiles() {
  const directory = path.join(userDataPath, "api-studio-collection-bodies");
  const projects = fs.existsSync(directory) ? fs.readdirSync(directory) : [];

  return projects.flatMap((entry) => fs.readdirSync(path.join(directory, entry)));
}

function example(over: Record<string, unknown> = {}) {
  return {
    id: "example-1",
    name: "200 OK",
    status: 200,
    statusText: "OK",
    durationMs: 12,
    headers: [],
    mediaType: "application/json",
    body: '{"id":"42"}',
    bodyBytes: 11,
    truncated: false,
    receivedAt: "2026-08-20T09:00:00.000Z",
    request: null,
    ...over
  };
}

function request(over: Partial<CustomRequest> = {}): CustomRequest {
  return {
    id: "request-1",
    name: "Fetch a user",
    routeId: "route_1",
    route: {
      id: "route_1",
      folder: "users",
      workspace: "",
      method: "GET",
      path: "/users/{id}",
      summary: "Fetch a user",
      operationId: "getUser",
      tags: [],
      servers: [],
      headers: [],
      security: [],
      source: {
        kind: "openapi",
        filePath: "openapi.yaml",
        line: 14,
        adapter: "openapi",
        confidence: "exact"
      },
      firstSeenAt: "2026-08-18T09:30:00.000Z"
    },
    draft: null,
    examples: [],
    ...over
  };
}

function collection(over: Partial<CustomCollection> = {}): CustomCollection {
  return { id: "collection-1", name: "Public API", folders: [], requests: [], ...over };
}

beforeEach(() => {
  fs.rmSync(storeFile(), { force: true });
});

describe("collections a user builds", () => {
  it("has nothing for a project nobody has collected anything in", () => {
    expect(readCustomCollections(PROJECT)).toEqual([]);
  });

  it("keeps a request in the collection itself and in a folder", () => {
    saveCustomCollections(PROJECT, [
      collection({
        requests: [request()],
        folders: [{ id: "folder-1", name: "Auth", requests: [request({ id: "request-2" })] }]
      })
    ]);

    const [kept] = readCustomCollections(PROJECT);

    expect(kept.requests.map((entry) => entry.id)).toEqual(["request-1"]);
    expect(kept.folders[0].requests.map((entry) => entry.id)).toEqual(["request-2"]);
  });

  it("writes beside the app and never into the project", () => {
    saveCustomCollections(PROJECT, [collection()]);

    expect(fs.existsSync(storeFile())).toBe(true);
    expect(fs.existsSync(path.join(PROJECT, ".lazify"))).toBe(false);
  });

  it("keeps each project's collections to itself", () => {
    saveCustomCollections(PROJECT, [collection()]);
    saveCustomCollections(OTHER_PROJECT, [collection({ id: "collection-2", name: "Other" })]);

    expect(readCustomCollections(PROJECT).map((entry) => entry.name)).toEqual(["Public API"]);
    expect(readCustomCollections(OTHER_PROJECT).map((entry) => entry.name)).toEqual(["Other"]);
  });

  it("keeps the draft a request was edited into", () => {
    const draft = {
      mode: "json" as const,
      json: '{"name":"Ada"}',
      entries: [],
      fields: { "path:id": "42" },
      scripts: { pre: "", post: "" },
      savedAt: "2026-08-20T09:00:00.000Z"
    };

    saveCustomCollections(PROJECT, [collection({ requests: [request({ draft })] })]);

    expect(readCustomCollections(PROJECT)[0].requests[0].draft).toEqual(draft);
  });

  it("fills in what an older or damaged file left out", () => {
    fs.writeFileSync(
      storeFile(),
      JSON.stringify({
        version: 1,
        projects: {
          [path.resolve(PROJECT)]: [
            { id: "collection-1", requests: [{ ...request(), draft: { json: '{"a":1}' } }] }
          ]
        }
      })
    );

    const [kept] = readCustomCollections(PROJECT);

    expect(kept).toEqual(
      expect.objectContaining({ name: "", folders: [] })
    );
    expect(kept.requests[0].draft).toEqual(
      expect.objectContaining({ mode: "json", entries: [], fields: {}, scripts: { pre: "", post: "" } })
    );
  });

  it("keeps a saved response with the request it came from", () => {
    saveCustomCollections(PROJECT, [
      collection({ requests: [request({ examples: [example()] })] })
    ]);

    const [kept] = readCustomCollections(PROJECT);
    const [saved] = kept.requests[0].examples;

    expect(saved.name).toBe("200 OK");
    expect(saved.body).toBe("");
    expect(readCollectionBody(PROJECT, saved.bodyFile!)).toBe('{"id":"42"}');
  });

  it("does not carry response bodies in the index it rewrites", () => {
    saveCustomCollections(PROJECT, [
      collection({ requests: [request({ examples: [example()] })] })
    ]);

    expect(fs.readFileSync(storeFile(), "utf8")).not.toContain('{\\"id\\":\\"42\\"}');
    expect(bodyFiles()).toHaveLength(1);
  });

  it("drops the bodies of a request that is gone", () => {
    saveCustomCollections(PROJECT, [
      collection({ requests: [request({ examples: [example()] })] })
    ]);
    saveCustomCollections(PROJECT, [collection()]);

    expect(bodyFiles()).toEqual([]);
  });

  it("forgets a project once its last collection is gone", () => {
    saveCustomCollections(PROJECT, [collection()]);
    saveCustomCollections(PROJECT, []);

    expect(readCustomCollections(PROJECT)).toEqual([]);
    expect(JSON.parse(fs.readFileSync(storeFile(), "utf8")).projects).toEqual({});
  });
});
