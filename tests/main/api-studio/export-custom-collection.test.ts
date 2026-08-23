import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-export-custom-"));

vi.mock("electron", () => ({ app: { getPath: () => userDataPath } }));

const { saveCustomCollections } = await import("../../../src/main/api-studio/custom-collections");
const { exportCustomCollection } = await import(
  "../../../src/main/api-studio/export/write-custom-collection"
);
type CustomRequest = import("../../../src/main/api-studio/custom-collections").CustomRequest;

let projectPath: string;
let filePath: string;

function request(over: Partial<CustomRequest> = {}): CustomRequest {
  return {
    id: "request-1",
    name: "Log in",
    routeId: "route_1",
    route: {
      id: "route_1",
      folder: "SystemUser",
      workspace: "",
      method: "POST",
      path: "/SystemUser/Login",
      summary: null,
      operationId: null,
      tags: [],
      servers: ["http://localhost:5257"],
      headers: [],
      security: [],
      source: {
        kind: "scanner",
        filePath: "Controllers/SystemUserController.cs",
        line: 44,
        adapter: "aspnet",
        confidence: "exact"
      },
      firstSeenAt: "2026-08-20T09:00:00.000Z",
      parameters: [],
      requestBody: null,
      responses: []
    },
    draft: {
      mode: "json",
      json: '{"userName":"ada"}',
      entries: [],
      fields: {},
      scripts: { pre: "", post: "" },
      savedAt: "2026-08-20T09:00:00.000Z"
    },
    examples: [],
    ...over
  };
}

function written() {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

beforeEach(() => {
  projectPath = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-export-project-"));
  filePath = path.join(projectPath, "out.json");
  fs.rmSync(path.join(userDataPath, "api-studio-collections.json"), { force: true });
});

describe("exporting a collection of the user's own", () => {
  it("writes that collection, under its own name, with its folders", async () => {
    saveCustomCollections(projectPath, [
      {
        id: "collection-1",
        name: "Partner Documentation",
        folders: [{ id: "folder-1", name: "Authentication", requests: [request()] }],
        requests: [request({ id: "request-2", name: "Health", routeId: "route_2" })]
      }
    ]);

    const result = await exportCustomCollection(projectPath, "collection-1", filePath);

    expect(result).toEqual({ filePath, routes: 2 });
    expect(written().info.name).toBe("Partner Documentation");
    expect(written().item.map((group: { name: string }) => group.name)).toEqual([
      "Authentication",
      "Partner Documentation"
    ]);
  });

  it("names each request the way the user named it, and carries what was typed", async () => {
    saveCustomCollections(projectPath, [
      {
        id: "collection-1",
        name: "Partner Documentation",
        folders: [],
        requests: [request()]
      }
    ]);

    await exportCustomCollection(projectPath, "collection-1", filePath);

    const item = written().item[0].item[0];

    expect(item.name).toBe("Log in");
    expect(item.request.method).toBe("POST");
    expect(item.request.body.raw).toContain("ada");
  });

  it("leaves other collections and the project's routes out of it", async () => {
    saveCustomCollections(projectPath, [
      { id: "collection-1", name: "Mine", folders: [], requests: [request()] },
      {
        id: "collection-2",
        name: "Theirs",
        folders: [],
        requests: [request({ id: "request-3", name: "Not this one" })]
      }
    ]);

    await exportCustomCollection(projectPath, "collection-1", filePath);

    const names = written().item.flatMap((group: { item: Array<{ name: string }> }) =>
      group.item.map((entry) => entry.name)
    );

    expect(names).toEqual(["Log in"]);
  });

  it("says nothing for a collection that is gone", async () => {
    expect(await exportCustomCollection(projectPath, "collection-9", filePath)).toBeNull();
    expect(fs.existsSync(filePath)).toBe(false);
  });
});
