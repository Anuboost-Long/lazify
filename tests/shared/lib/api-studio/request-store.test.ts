import { execFile as nodeExecFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { appFolders, nodeFolders } from "../../../platform/node-folders";

const userDataPath = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "lazify-api-request-store-")));
appFolders.data = userDataPath;

vi.mock("@chain/sdk", () => ({ desktop: { folders: nodeFolders } }));

/** chmod's real effect is the thing under test, so this runs it for real rather than faking it. */
vi.mock("@/platform/exec", () => ({
  restrictToOwner: async (filePath: string) => {
    if (process.platform === "win32") return;

    await promisify(nodeExecFile)("chmod", ["600", filePath]);
  },
}));

const {
  bodyDirectory,
  collectExpiredResponses,
  forgetRequest,
  readResponseBody,
  readRequests,
  saveRequest,
  setRequestStorage
} = await import("@/shared/lib/api-studio/request-store");
type SavedRequest = import("@/shared/lib/api-studio/request-store").SavedRequest;

let projectPath: string;

function storeFile() {
  return path.join(userDataPath, "api-studio-requests.json");
}

function projectFile() {
  return path.join(projectPath, ".lazify", "api-studio", "requests.json");
}

function request(over: Partial<SavedRequest> = {}): SavedRequest {
  return {
    mode: "json",
    json: '{"name":"Ada"}',
    entries: [],
    fields: { "path:id": "42" },
    scripts: { pre: "", post: "" },
    response: null,
    examples: [],
    savedAt: "2026-08-19T09:00:00.000Z",
    ...over
  };
}

beforeEach(() => {
  projectPath = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "lazify-api-request-project-")));
  fs.rmSync(storeFile(), { force: true });
});

afterEach(() => {
  fs.rmSync(projectPath, { recursive: true, force: true });
});

describe("saved requests", () => {
  it("has nothing, and no place chosen, for a project nobody has edited", async () => {
    expect(await readRequests(projectPath)).toEqual({ location: null, requests: {} });
  });

  it("keeps what a user typed against the route id that produced it", async () => {
    await saveRequest(projectPath, "route_1", request());

    expect((await readRequests(projectPath)).requests.route_1).toMatchObject({
      json: '{"name":"Ada"}',
      fields: { "path:id": "42" }
    });
  });

  it("keeps to this machine until a user says otherwise", async () => {
    await saveRequest(projectPath, "route_1", request());

    expect(fs.existsSync(path.join(projectPath, ".lazify"))).toBe(false);
  });

  it.skipIf(process.platform === "win32")(
    "writes the store for its owner alone, where the filesystem carries modes",
    async () => {
      await saveRequest(projectPath, "route_1", request());

      expect(fs.statSync(storeFile()).mode & 0o777).toBe(0o600);
    }
  );

  it("moves what a user typed into the project when they choose the project", async () => {
    await saveRequest(projectPath, "route_1", request());

    const store = await setRequestStorage(projectPath, "project");

    expect(store.location).toBe("project");
    expect(JSON.parse(fs.readFileSync(projectFile(), "utf8")).requests.route_1.json).toBe(
      '{"name":"Ada"}'
    );
    expect(JSON.parse(fs.readFileSync(storeFile(), "utf8")).projects[projectPath]).toBeUndefined();
    expect((await readRequests(projectPath)).requests.route_1.json).toBe('{"name":"Ada"}');
  });

  it("moves them back out of the project when they choose this machine", async () => {
    await saveRequest(projectPath, "route_1", request());
    await setRequestStorage(projectPath, "project");
    await setRequestStorage(projectPath, "app");

    expect(fs.existsSync(projectFile())).toBe(false);
    expect(await readRequests(projectPath)).toMatchObject({
      location: "app",
      requests: { route_1: { json: '{"name":"Ada"}' } }
    });
  });

  it("follows a checked-in file whatever this machine chose before", async () => {
    await saveRequest(projectPath, "route_1", request());
    fs.mkdirSync(path.dirname(projectFile()), { recursive: true });
    fs.writeFileSync(
      projectFile(),
      JSON.stringify({ version: 1, requests: { route_9: request({ json: "{}" }) } })
    );

    expect(await readRequests(projectPath)).toMatchObject({
      location: "project",
      requests: { route_9: { json: "{}" } }
    });
  });

  it("saves into the project once that is where they live", async () => {
    await setRequestStorage(projectPath, "project");
    await saveRequest(projectPath, "route_1", request());

    expect(JSON.parse(fs.readFileSync(projectFile(), "utf8")).requests.route_1).toBeTruthy();
  });

  it("keeps one project's requests apart from another's", async () => {
    const other = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-api-request-other-"));

    await saveRequest(projectPath, "route_1", request());
    await saveRequest(other, "route_1", request({ json: '{"name":"Grace"}' }));

    expect((await readRequests(projectPath)).requests.route_1.json).toBe('{"name":"Ada"}');
    expect((await readRequests(other)).requests.route_1.json).toBe('{"name":"Grace"}');

    fs.rmSync(other, { recursive: true, force: true });
  });

  it("keeps the examples a user saved for a route", async () => {
    await saveRequest(projectPath, "route_1", request({ examples: [{
      id: "example-1",
      name: "200 OK",
      request: null,
      status: 200,
      statusText: "OK",
      durationMs: 12,
      headers: [],
      mediaType: "application/json",
      body: '{"id":7}',
      bodyBytes: 8,
      truncated: false,
      receivedAt: "2026-08-19T09:00:00.000Z"
    }] }));

    expect((await readRequests(projectPath)).requests.route_1.examples).toEqual([
      expect.objectContaining({ name: "200 OK", body: "" })
    ]);
    expect(
      await readResponseBody(projectPath, (await readRequests(projectPath)).requests.route_1.examples[0].bodyFile!)
    ).toBe('{"id":7}');
  });

  it("keeps only the newest examples when a route collects too many", async () => {
    const many = Array.from({ length: 14 }, (_, at) => ({
      id: `example-${at}`,
      name: `Example ${at}`,
      status: 200,
      statusText: "OK",
      durationMs: 1,
      headers: [],
      mediaType: null,
      body: "{}",
      bodyBytes: 2,
      truncated: false,
      request: null,
      receivedAt: "2026-08-19T09:00:00.000Z"
    }));

    await saveRequest(projectPath, "route_1", request({ examples: many }));

    const kept = (await readRequests(projectPath)).requests.route_1.examples;

    expect(kept).toHaveLength(10);
    expect(kept[0].name).toBe("Example 4");
    expect(kept[9].name).toBe("Example 13");
  });

  it("keeps a large body whole, in a file of its own", async () => {
    const rows = Array.from({ length: 4000 }, (_, at) => ({ id: at, note: "x".repeat(120) }));
    const body = JSON.stringify({ data: rows });

    await saveRequest(
      projectPath,
      "route_1",
      request({
        response: {
          status: 200,
          statusText: "OK",
          durationMs: 12,
          headers: [],
          mediaType: "application/json",
          body,
          bodyBytes: body.length,
          truncated: false,
          receivedAt: "2026-08-19T09:00:00.000Z"
        }
      })
    );

    const stored = (await readRequests(projectPath)).requests.route_1.response!;

    expect(await readResponseBody(projectPath, stored.bodyFile!)).toBe(body);
    expect(stored.truncated).toBe(false);
    expect(JSON.parse(await readResponseBody(projectPath, stored.bodyFile!)).data).toHaveLength(4000);
  });

  it("leaves the bodies out of the index it reads at startup", async () => {
    const body = JSON.stringify({ id: 7 });

    await saveRequest(
      projectPath,
      "route_1",
      request({
        response: {
          status: 200,
          statusText: "OK",
          durationMs: 12,
          headers: [],
          mediaType: "application/json",
          body,
          bodyBytes: body.length,
          truncated: false,
          receivedAt: "2026-08-19T09:00:00.000Z"
        }
      })
    );

    const index = (await readRequests(projectPath)).requests.route_1;

    expect(index.response!.body).toBe("");
    expect(index.response!.bodyFile).toMatch(/-response\.txt$/);
    expect(fs.readFileSync(storeFile(), "utf8")).not.toContain('{"id":7}');
    expect(await readResponseBody(projectPath, index.response!.bodyFile!)).toBe(body);
  });

  it("removes a body file the route stops referencing", async () => {
    const example = {
      id: "example-1",
      name: "200 OK",
      request: null,
      status: 200,
      statusText: "OK",
      durationMs: 1,
      headers: [],
      mediaType: "application/json",
      body: '{"kept":false}',
      bodyBytes: 14,
      truncated: false,
      receivedAt: "2026-08-19T09:00:00.000Z"
    };

    await saveRequest(projectPath, "route_1", request({ examples: [example] }));

    const directory = await bodyDirectory(projectPath, "app");

    expect(fs.readdirSync(directory)).toHaveLength(1);

    await saveRequest(projectPath, "route_1", request({ examples: [] }));

    expect(fs.readdirSync(directory)).toHaveLength(0);
  });

  it("takes the bodies along when a user moves where requests live", async () => {
    const body = '{"id":7}';

    await saveRequest(
      projectPath,
      "route_1",
      request({
        response: {
          status: 200,
          statusText: "OK",
          durationMs: 1,
          headers: [],
          mediaType: "application/json",
          body,
          bodyBytes: body.length,
          truncated: false,
          receivedAt: "2026-08-19T09:00:00.000Z"
        }
      })
    );

    await setRequestStorage(projectPath, "project");

    const moved = (await readRequests(projectPath)).requests.route_1.response!;

    expect(fs.existsSync(await bodyDirectory(projectPath, "app"))).toBe(false);
    expect(await readResponseBody(projectPath, moved.bodyFile!)).toBe(body);
  });

  it("collects a response nobody saved once its five minutes are up", async () => {
    const at = "2026-08-19T09:00:00.000Z";
    const response = {
      status: 200,
      statusText: "OK",
      durationMs: 12,
      headers: [],
      mediaType: "application/json",
      body: '{"id":7}',
      bodyBytes: 8,
      truncated: false,
      receivedAt: at
    };

    await saveRequest(projectPath, "route_1", request({ response }));

    const soon = Date.parse(at) + 4 * 60 * 1000;

    expect((await collectExpiredResponses(projectPath, soon)).requests.route_1.response).toBeTruthy();
    expect(fs.readdirSync(await bodyDirectory(projectPath, "app"))).toHaveLength(1);

    const later = Date.parse(at) + 6 * 60 * 1000;

    expect((await collectExpiredResponses(projectPath, later)).requests.route_1.response).toBeNull();
    expect((await readRequests(projectPath)).requests.route_1.response).toBeNull();
    expect(fs.readdirSync(await bodyDirectory(projectPath, "app"))).toHaveLength(0);
  });

  it("never collects a response a user saved as an example", async () => {
    const at = "2026-08-19T09:00:00.000Z";

    await saveRequest(
      projectPath,
      "route_1",
      request({
        examples: [
          {
            id: "example-1",
            name: "200 OK",
            request: null,
            status: 200,
            statusText: "OK",
            durationMs: 12,
            headers: [],
            mediaType: "application/json",
            body: '{"kept":true}',
            bodyBytes: 13,
            truncated: false,
            receivedAt: at
          }
        ]
      })
    );

    const later = Date.parse(at) + 60 * 60 * 1000;
    const swept = await collectExpiredResponses(projectPath, later);

    expect(swept.requests.route_1.examples).toHaveLength(1);
    expect(
      await readResponseBody(projectPath, (await readRequests(projectPath)).requests.route_1.examples[0].bodyFile!)
    ).toBe('{"kept":true}');
  });

  it("keeps what a user typed when it collects the response beside it", async () => {
    const at = "2026-08-19T09:00:00.000Z";

    await saveRequest(
      projectPath,
      "route_1",
      request({
        json: '{"name":"Ada"}',
        response: {
          status: 200,
          statusText: "OK",
          durationMs: 12,
          headers: [],
          mediaType: "application/json",
          body: '{"id":7}',
          bodyBytes: 8,
          truncated: false,
          receivedAt: at
        }
      })
    );

    const swept = await collectExpiredResponses(projectPath, Date.parse(at) + 6 * 60 * 1000);

    expect(swept.requests.route_1.json).toBe('{"name":"Ada"}');
    expect(swept.requests.route_1.fields).toEqual({ "path:id": "42" });
  });

  it("reads a store an older version wrote, without a shape it never had", async () => {
    fs.mkdirSync(path.dirname(storeFile()), { recursive: true });
    fs.writeFileSync(
      storeFile(),
      JSON.stringify({
        version: 1,
        locations: { [projectPath]: "app" },
        projects: {
          [projectPath]: {
            route_1: {
              mode: "json",
              json: '{"name":"Ada"}',
              entries: [],
              fields: {},
              response: {
                status: 200,
                statusText: "OK",
                durationMs: 12,
                headers: [],
                mediaType: "application/json",
                body: '{"id":7}',
                bodyBytes: 8,
                truncated: false,
                receivedAt: "2026-08-19T09:00:00.000Z"
              },
              savedAt: "2026-08-19T09:00:00.000Z"
            }
          }
        }
      })
    );

    expect((await readRequests(projectPath)).requests.route_1.examples).toEqual([]);
    await collectExpiredResponses(projectPath, Date.parse("2026-08-19T09:10:00.000Z"));
    expect((await readRequests(projectPath)).requests.route_1.response).toBeNull();
    expect((await readRequests(projectPath)).requests.route_1.json).toBe('{"name":"Ada"}');
  });

  it("does not let a save that never read the bodies erase them", async () => {
    const example = {
      id: "example-1",
      name: "200 OK",
      request: null,
      status: 200,
      statusText: "OK",
      durationMs: 12,
      headers: [],
      mediaType: "application/json",
      body: '{"token":"kept"}',
      bodyBytes: 16,
      truncated: false,
      receivedAt: "2026-08-19T09:00:00.000Z"
    };

    await saveRequest(projectPath, "route_1", request({ examples: [example] }));

    /** What the index hands back: the example, its file named, its body unread. */
    const index = (await readRequests(projectPath)).requests.route_1;

    expect(index.examples[0].body).toBe("");

    await saveRequest(projectPath, "route_1", { ...index, json: '{"edited":true}' });

    const reread = (await readRequests(projectPath)).requests.route_1;

    expect(reread.json).toBe('{"edited":true}');
    expect(await readResponseBody(projectPath, reread.examples[0].bodyFile!)).toBe('{"token":"kept"}');
  });

  it("forgets one route without touching its neighbours", async () => {
    await saveRequest(projectPath, "route_1", request());
    await saveRequest(projectPath, "route_2", request({ json: "{}" }));

    await forgetRequest(projectPath, "route_1");

    expect((await readRequests(projectPath)).requests).toEqual({
      route_2: expect.objectContaining({ json: "{}" })
    });
  });
});
