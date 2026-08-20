import { describe, expect, it } from "vitest";

import { buildPostmanCollection } from "../../../src/main/api-studio/export/postman-collection";
import { deriveEnvironmentVariables } from "../../../src/main/api-studio/environment";
import type { SavedRoute } from "../../../src/main/api-studio/types";
import type { SavedRequest } from "../../../src/main/api-studio/request-store";

function route(over: Partial<SavedRoute> = {}): SavedRoute {
  return {
    id: "route_1",
    workspace: "",
    firstSeenAt: "2026-08-19T09:00:00.000Z",
    folder: "users",
    method: "GET",
    path: "/users/{id}",
    summary: "Fetch a user",
    description: null,
    operationId: null,
    tags: [],
    servers: ["http://localhost:5000"],
    source: {
      kind: "openapi",
      filePath: "openapi.yaml",
      line: 4,
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
    responses: [],
    security: [],
    ...over
  };
}

function collectionOf(routes: SavedRoute[], requests: Record<string, SavedRequest> = {}) {
  return buildPostmanCollection(
    "demo",
    routes,
    deriveEnvironmentVariables(routes),
    { baseUrl: "http://localhost:5000" },
    requests
  );
}

describe("exporting a collection Postman can read", () => {
  it("declares itself as a v2.1 collection", () => {
    const collection = collectionOf([route()]);

    expect(collection.info).toEqual({
      name: "demo",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    });
  });

  it("writes a path placeholder the way Postman writes one", () => {
    const [folder] = collectionOf([route()]).item;

    expect(folder.name).toBe("users");
    expect(folder.item[0].request.url).toMatchObject({
      raw: "{{baseUrl}}/users/:id",
      host: ["{{baseUrl}}"],
      path: ["users", ":id"],
      variable: [{ key: "id", value: "", description: "The user id" }]
    });
  });

  it("carries every variable the routes need, and no secret value with them", () => {
    const secured = route({
      security: [
        { kind: "bearer", schemeName: "bearerAuth", location: "header", parameterName: "Authorization" }
      ]
    });

    const collection = buildPostmanCollection(
      "demo",
      [secured],
      deriveEnvironmentVariables([secured]),
      { baseUrl: "http://localhost:5000", bearerToken: "do-not-export-me" }
    );

    expect(collection.variable).toContainEqual({
      key: "baseUrl",
      value: "http://localhost:5000"
    });
    expect(collection.variable).toContainEqual({ key: "bearerToken", value: "" });
    expect(JSON.stringify(collection)).not.toContain("do-not-export-me");
  });

  it("sends a scheme as the header it actually sends", () => {
    const secured = route({
      security: [
        { kind: "apiKey", schemeName: "ApiKeyAuth", location: "header", parameterName: "X-API-KEY" },
        { kind: "bearer", schemeName: "bearerAuth", location: "header", parameterName: "Authorization" }
      ]
    });

    const headers = collectionOf([secured]).item[0].item[0].request.header;

    expect(headers).toContainEqual({ key: "X-API-KEY", value: "{{xApiKey}}" });
    expect(headers).toContainEqual({ key: "Authorization", value: "Bearer {{bearerToken}}" });
  });

  it("marks an optional query parameter disabled rather than dropping it", () => {
    const listing = route({
      path: "/users",
      parameters: [
        {
          name: "page",
          location: "query",
          required: true,
          description: null,
          schemaType: "integer",
          example: "1"
        },
        {
          name: "search",
          location: "query",
          required: false,
          description: null,
          schemaType: "string",
          example: null
        }
      ]
    });

    const { url } = collectionOf([listing]).item[0].item[0].request;

    expect(url.query).toEqual([
      { key: "page", value: "1", description: undefined, disabled: false },
      { key: "search", value: "", description: undefined, disabled: true }
    ]);
    expect(url.raw).toBe("{{baseUrl}}/users?page=1");
  });

  it("prefers the body a user typed over the one the schema declared", () => {
    const create = route({
      method: "POST",
      path: "/users",
      requestBody: {
        required: true,
        description: null,
        variants: [
          {
            mediaType: "application/json",
            schemaType: "User",
            example: null,
            defaultBody: '{"name":"string"}'
          }
        ]
      }
    });

    const declared = collectionOf([create]).item[0].item[0].request.body;

    expect(declared).toMatchObject({ mode: "raw", raw: '{"name":"string"}' });

    const typed = collectionOf([create], {
      route_1: {
        mode: "json",
        json: '{"name":"Ada"}',
        entries: [],
        fields: {},
        scripts: { pre: "", post: "" },
        response: null,
        examples: [],
        savedAt: "2026-08-19T09:00:00.000Z"
      }
    });

    expect(typed.item[0].item[0].request.body).toMatchObject({ raw: '{"name":"Ada"}' });
  });

  it("exports a saved example as a saved response", () => {
    const collection = collectionOf([route()], {
      route_1: {
        mode: "json",
        json: "",
        entries: [],
        fields: {},
        scripts: { pre: "", post: "" },
        response: null,
        savedAt: "2026-08-19T09:00:00.000Z",
        examples: [
          {
            id: "example-1",
            name: "200 OK",
            request: null,
            status: 200,
            statusText: "OK",
            durationMs: 12,
            headers: [{ name: "content-type", value: "application/json" }],
            mediaType: "application/json",
            body: '{"id":"42"}',
            bodyBytes: 11,
            truncated: false,
            receivedAt: "2026-08-19T09:00:00.000Z"
          }
        ]
      }
    });

    expect(collection.item[0].item[0].response).toEqual([
      {
        name: "200 OK",
        status: "OK",
        code: 200,
        header: [{ key: "content-type", value: "application/json" }],
        body: '{"id":"42"}',
        _postman_previewlanguage: "json"
      }
    ]);
  });

  it("groups routes into the folders the collection lists them under", () => {
    const collection = collectionOf([
      route(),
      route({ id: "route_2", folder: "orders", path: "/orders", summary: "List orders" })
    ]);

    expect(collection.item.map((folder) => folder.name)).toEqual(["users", "orders"]);
    expect(collection.item[1].item[0].name).toBe("List orders");
  });
});
