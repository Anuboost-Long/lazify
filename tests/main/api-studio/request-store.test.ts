import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-api-request-store-"));

vi.mock("electron", () => ({ app: { getPath: () => userDataPath } }));

const {
  bodyDirectory,
  collectExpiredResponses,
  forgetRequest,
  readResponseBody,
  readRequests,
  saveRequest,
  setRequestStorage
} = await import("../../../src/main/api-studio/request-store");
type SavedRequest = import("../../../src/main/api-studio/request-store").SavedRequest;

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
  projectPath = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-api-request-project-"));
  fs.rmSync(storeFile(), { force: true });
});

afterEach(() => {
  fs.rmSync(projectPath, { recursive: true, force: true });
});

describe("saved requests", () => {
  it("has nothing, and no place chosen, for a project nobody has edited", () => {
    expect(readRequests(projectPath)).toEqual({ location: null, requests: {} });
  });

  it("keeps what a user typed against the route id that produced it", () => {
    saveRequest(projectPath, "route_1", request());

    expect(readRequests(projectPath).requests.route_1).toMatchObject({
      json: '{"name":"Ada"}',
      fields: { "path:id": "42" }
    });
  });

  it("keeps to this machine until a user says otherwise", () => {
    saveRequest(projectPath, "route_1", request());

    expect(fs.existsSync(path.join(projectPath, ".lazify"))).toBe(false);
    expect(fs.statSync(storeFile()).mode & 0o777).toBe(0o600);
  });

  it("moves what a user typed into the project when they choose the project", () => {
    saveRequest(projectPath, "route_1", request());

    const store = setRequestStorage(projectPath, "project");

    expect(store.location).toBe("project");
    expect(JSON.parse(fs.readFileSync(projectFile(), "utf8")).requests.route_1.json).toBe(
      '{"name":"Ada"}'
    );
    expect(JSON.parse(fs.readFileSync(storeFile(), "utf8")).projects[projectPath]).toBeUndefined();
    expect(readRequests(projectPath).requests.route_1.json).toBe('{"name":"Ada"}');
  });

  it("moves them back out of the project when they choose this machine", () => {
    saveRequest(projectPath, "route_1", request());
    setRequestStorage(projectPath, "project");
    setRequestStorage(projectPath, "app");

    expect(fs.existsSync(projectFile())).toBe(false);
    expect(readRequests(projectPath)).toMatchObject({
      location: "app",
      requests: { route_1: { json: '{"name":"Ada"}' } }
    });
  });

  it("follows a checked-in file whatever this machine chose before", () => {
    saveRequest(projectPath, "route_1", request());
    fs.mkdirSync(path.dirname(projectFile()), { recursive: true });
    fs.writeFileSync(
      projectFile(),
      JSON.stringify({ version: 1, requests: { route_9: request({ json: "{}" }) } })
    );

    expect(readRequests(projectPath)).toMatchObject({
      location: "project",
      requests: { route_9: { json: "{}" } }
    });
  });

  it("saves into the project once that is where they live", () => {
    setRequestStorage(projectPath, "project");
    saveRequest(projectPath, "route_1", request());

    expect(JSON.parse(fs.readFileSync(projectFile(), "utf8")).requests.route_1).toBeTruthy();
  });

  it("keeps one project's requests apart from another's", () => {
    const other = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-api-request-other-"));

    saveRequest(projectPath, "route_1", request());
    saveRequest(other, "route_1", request({ json: '{"name":"Grace"}' }));

    expect(readRequests(projectPath).requests.route_1.json).toBe('{"name":"Ada"}');
    expect(readRequests(other).requests.route_1.json).toBe('{"name":"Grace"}');

    fs.rmSync(other, { recursive: true, force: true });
  });

  it("keeps the examples a user saved for a route", () => {
    saveRequest(projectPath, "route_1", request({ examples: [{
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

    expect(readRequests(projectPath).requests.route_1.examples).toEqual([
      expect.objectContaining({ name: "200 OK", body: "" })
    ]);
    expect(
      readResponseBody(projectPath, readRequests(projectPath).requests.route_1.examples[0].bodyFile!)
    ).toBe('{"id":7}');
  });

  it("keeps only the newest examples when a route collects too many", () => {
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

    saveRequest(projectPath, "route_1", request({ examples: many }));

    const kept = readRequests(projectPath).requests.route_1.examples;

    expect(kept).toHaveLength(10);
    expect(kept[0].name).toBe("Example 4");
    expect(kept[9].name).toBe("Example 13");
  });

  it("keeps a large body whole, in a file of its own", () => {
    const rows = Array.from({ length: 4000 }, (_, at) => ({ id: at, note: "x".repeat(120) }));
    const body = JSON.stringify({ data: rows });

    saveRequest(
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

    const stored = readRequests(projectPath).requests.route_1.response!;

    expect(readResponseBody(projectPath, stored.bodyFile!)).toBe(body);
    expect(stored.truncated).toBe(false);
    expect(JSON.parse(readResponseBody(projectPath, stored.bodyFile!)).data).toHaveLength(4000);
  });

  it("leaves the bodies out of the index it reads at startup", () => {
    const body = JSON.stringify({ id: 7 });

    saveRequest(
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

    const index = readRequests(projectPath).requests.route_1;

    expect(index.response!.body).toBe("");
    expect(index.response!.bodyFile).toMatch(/-response\.txt$/);
    expect(fs.readFileSync(storeFile(), "utf8")).not.toContain('{"id":7}');
    expect(readResponseBody(projectPath, index.response!.bodyFile!)).toBe(body);
  });

  it("removes a body file the route stops referencing", () => {
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

    saveRequest(projectPath, "route_1", request({ examples: [example] }));

    const directory = bodyDirectory(projectPath, "app");

    expect(fs.readdirSync(directory)).toHaveLength(1);

    saveRequest(projectPath, "route_1", request({ examples: [] }));

    expect(fs.readdirSync(directory)).toHaveLength(0);
  });

  it("takes the bodies along when a user moves where requests live", () => {
    const body = '{"id":7}';

    saveRequest(
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

    setRequestStorage(projectPath, "project");

    const moved = readRequests(projectPath).requests.route_1.response!;

    expect(fs.existsSync(bodyDirectory(projectPath, "app"))).toBe(false);
    expect(readResponseBody(projectPath, moved.bodyFile!)).toBe(body);
  });

  it("collects a response nobody saved once its five minutes are up", () => {
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

    saveRequest(projectPath, "route_1", request({ response }));

    const soon = Date.parse(at) + 4 * 60 * 1000;

    expect(collectExpiredResponses(projectPath, soon).requests.route_1.response).toBeTruthy();
    expect(fs.readdirSync(bodyDirectory(projectPath, "app"))).toHaveLength(1);

    const later = Date.parse(at) + 6 * 60 * 1000;

    expect(collectExpiredResponses(projectPath, later).requests.route_1.response).toBeNull();
    expect(readRequests(projectPath).requests.route_1.response).toBeNull();
    expect(fs.readdirSync(bodyDirectory(projectPath, "app"))).toHaveLength(0);
  });

  it("never collects a response a user saved as an example", () => {
    const at = "2026-08-19T09:00:00.000Z";

    saveRequest(
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
    const swept = collectExpiredResponses(projectPath, later);

    expect(swept.requests.route_1.examples).toHaveLength(1);
    expect(
      readResponseBody(projectPath, readRequests(projectPath).requests.route_1.examples[0].bodyFile!)
    ).toBe('{"kept":true}');
  });

  it("keeps what a user typed when it collects the response beside it", () => {
    const at = "2026-08-19T09:00:00.000Z";

    saveRequest(
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

    const swept = collectExpiredResponses(projectPath, Date.parse(at) + 6 * 60 * 1000);

    expect(swept.requests.route_1.json).toBe('{"name":"Ada"}');
    expect(swept.requests.route_1.fields).toEqual({ "path:id": "42" });
  });

  it("reads a store an older version wrote, without a shape it never had", () => {
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

    expect(readRequests(projectPath).requests.route_1.examples).toEqual([]);
    expect(() =>
      collectExpiredResponses(projectPath, Date.parse("2026-08-19T09:10:00.000Z"))
    ).not.toThrow();
    expect(readRequests(projectPath).requests.route_1.response).toBeNull();
    expect(readRequests(projectPath).requests.route_1.json).toBe('{"name":"Ada"}');
  });

  it("does not let a save that never read the bodies erase them", () => {
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

    saveRequest(projectPath, "route_1", request({ examples: [example] }));

    /** What the index hands back: the example, its file named, its body unread. */
    const index = readRequests(projectPath).requests.route_1;

    expect(index.examples[0].body).toBe("");

    saveRequest(projectPath, "route_1", { ...index, json: '{"edited":true}' });

    const reread = readRequests(projectPath).requests.route_1;

    expect(reread.json).toBe('{"edited":true}');
    expect(readResponseBody(projectPath, reread.examples[0].bodyFile!)).toBe('{"token":"kept"}');
  });

  it("forgets one route without touching its neighbours", () => {
    saveRequest(projectPath, "route_1", request());
    saveRequest(projectPath, "route_2", request({ json: "{}" }));

    forgetRequest(projectPath, "route_1");

    expect(readRequests(projectPath).requests).toEqual({
      route_2: expect.objectContaining({ json: "{}" })
    });
  });
});
