import { describe, expect, it } from "vitest";

import {
  buildRequest,
  customVariableFor,
  deriveEnvironmentVariables,
  fieldKey,
  isLocalUrl,
  withCustomVariables
} from "../../../src/main/api-studio";
import type { RequestBodyInput } from "../../../src/main/api-studio";
import type { SavedRoute } from "../../../src/main/api-studio/types";

function route(over: Partial<SavedRoute> = {}): SavedRoute {
  return {
    id: "route_1",
    workspace: "",
    firstSeenAt: "2026-08-19T09:00:00.000Z",
    folder: "users",
    method: "GET",
    path: "/users/{id}",
    summary: null,
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
    parameters: [],
    headers: [],
    requestBody: null,
    responses: [],
    security: [],
    ...over
  };
}

function draftFor(
  open: SavedRoute,
  values: Record<string, string>,
  fields: Record<string, string> = {},
  body: RequestBodyInput | null = null
) {
  return buildRequest({
    route: open,
    variables: deriveEnvironmentVariables([open]),
    values,
    fields,
    body
  });
}

const LOCAL = { baseUrl: "http://localhost:5000" };

describe("building a request from a discovered route", () => {
  it("fills path placeholders with what the user typed", () => {
    const open = route({
      parameters: [
        {
          name: "id",
          location: "path",
          required: true,
          description: null,
          schemaType: "string",
          example: null
        }
      ]
    });

    const draft = draftFor(open, LOCAL, { [fieldKey("path", "id")]: "42" });

    expect(draft.url).toBe("http://localhost:5000/users/42");
  });

  it("leaves a placeholder in place when its value is still missing", () => {
    expect(draftFor(route(), LOCAL).url).toBe("http://localhost:5000/users/{id}");
  });

  it("appends only the query parameters that were given a value", () => {
    const open = route({
      path: "/users",
      parameters: [
        {
          name: "page",
          location: "query",
          required: false,
          description: null,
          schemaType: "integer",
          example: null
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

    const draft = draftFor(open, LOCAL, { [fieldKey("query", "page")]: "2" });

    expect(draft.url).toBe("http://localhost:5000/users?page=2");
  });

  it("carries a bearer token from the environment in the Authorization header", () => {
    const open = route({
      security: [
        { kind: "bearer", schemeName: "bearerAuth", location: "header", parameterName: "Authorization" }
      ]
    });

    const draft = draftFor(open, { ...LOCAL, bearerToken: "abc.def" });

    expect(draft.headers).toContainEqual({ name: "Authorization", value: "Bearer abc.def" });
  });

  it("does not repeat a scheme the stored value already carries", () => {
    const open = route({
      security: [
        { kind: "bearer", schemeName: "bearerAuth", location: "header", parameterName: "Authorization" }
      ]
    });

    const draft = draftFor(open, { ...LOCAL, bearerToken: "Bearer abc.def" });

    expect(draft.headers).toContainEqual({ name: "Authorization", value: "Bearer abc.def" });
  });

  it("sends an api key wherever its scheme declares it", () => {
    const open = route({
      security: [
        { kind: "apiKey", schemeName: "apiKey", location: "query", parameterName: "api_key" }
      ]
    });

    const draft = draftFor(open, { ...LOCAL, apiKey: "k-1" });

    expect(draft.url).toBe("http://localhost:5000/users/{id}?api_key=k-1");
  });

  it("fills a required header from the environment and lets a typed value win", () => {
    const open = route({
      headers: [{ name: "X-Tenant", value: null, required: true, description: null }]
    });

    expect(draftFor(open, { ...LOCAL, xTenant: "acme" }).headers).toContainEqual({
      name: "X-Tenant",
      value: "acme"
    });

    expect(
      draftFor(open, { ...LOCAL, xTenant: "acme" }, { [fieldKey("header", "X-Tenant")]: "beta" })
        .headers
    ).toContainEqual({ name: "X-Tenant", value: "beta" });
  });

  it("interpolates environment values written into a field or a body", () => {
    const open = route({
      method: "POST",
      path: "/users",
      requestBody: {
        required: true,
        description: null,
        variants: [
          { mediaType: "application/json", schemaType: "User", example: null, defaultBody: null }
        ]
      }
    });

    const draft = draftFor(open, { ...LOCAL, tenant: "acme" }, {}, {
      mode: "json",
      text: '{"tenant":"{{tenant}}"}'
    });

    expect(draft.body).toBe('{"tenant":"acme"}');
    expect(draft.headers).toContainEqual({ name: "Content-Type", value: "application/json" });
  });

  it("never sends a body on a method that cannot carry one", () => {
    expect(draftFor(route(), LOCAL, {}, { mode: "json", text: '{"a":1}' }).body).toBeNull();
  });

  it("encodes form entries as url-encoded pairs by default", () => {
    const open = route({ method: "POST", path: "/users" });
    const draft = draftFor(open, LOCAL, {}, {
      mode: "form",
      mediaType: "application/x-www-form-urlencoded",
      entries: [
        { name: "name", value: "Ada Lovelace" },
        { name: "", value: "dropped" }
      ]
    });

    expect(draft.body).toBe("name=Ada+Lovelace");
    expect(draft.headers).toContainEqual({
      name: "Content-Type",
      value: "application/x-www-form-urlencoded"
    });
  });

  it("states a multipart body rather than encoding one, so files can join it", () => {
    const open = route({ method: "POST", path: "/users" });
    const draft = draftFor(open, { ...LOCAL, tenant: "acme" }, {}, {
      mode: "form",
      mediaType: "multipart/form-data",
      entries: [
        { name: "tenant", value: "{{tenant}}" },
        { name: "avatar", value: "/tmp/avatar.png", kind: "file" }
      ]
    });

    expect(draft.body).toBeNull();
    expect(draft.multipart).toEqual([
      { name: "tenant", text: "acme" },
      { name: "avatar", filePath: "/tmp/avatar.png" }
    ]);
    /** The boundary belongs to the bytes, so the sender names it, not the builder. */
    expect(draft.headers).toContainEqual({
      name: "Content-Type",
      value: "multipart/form-data"
    });
  });

  it("sends nothing when a form has no named entry", () => {
    const open = route({ method: "POST", path: "/users" });
    const draft = draftFor(open, LOCAL, {}, {
      mode: "form",
      mediaType: "application/x-www-form-urlencoded",
      entries: [{ name: " ", value: "x" }]
    });

    expect(draft.body).toBeNull();
    expect(draft.headers.find((header) => header.name === "Content-Type")).toBeUndefined();
  });

  it("keeps the media type the document declared for a JSON body", () => {
    const open = route({
      method: "POST",
      path: "/users",
      requestBody: {
        required: true,
        description: null,
        variants: [
          {
            mediaType: "application/vnd.api+json",
            schemaType: "User",
            example: null,
            defaultBody: null
          }
        ]
      }
    });

    const draft = draftFor(open, LOCAL, {}, { mode: "json", text: '{"a":1}' });

    expect(draft.headers).toContainEqual({
      name: "Content-Type",
      value: "application/vnd.api+json"
    });
  });

  it("sends a variable the user added, on every route, where they put it", () => {
    const open = route();
    const variables = withCustomVariables(deriveEnvironmentVariables([open]), [
      customVariableFor("X-API-Key", "header", true),
      customVariableFor("tenant", "query", false)
    ]);

    const draft = buildRequest({
      route: open,
      variables,
      values: { ...LOCAL, xApiKey: "k-99", tenant: "acme" },
      fields: {},
      body: null
    });

    expect(draft.headers).toContainEqual({ name: "X-API-Key", value: "k-99" });
    expect(draft.url).toBe("http://localhost:5000/users/{id}?tenant=acme");
  });

  it("leaves an added variable out until it has a value", () => {
    const open = route();
    const variables = withCustomVariables(deriveEnvironmentVariables([open]), [
      customVariableFor("X-API-Key", "header", true)
    ]);

    const draft = buildRequest({ route: open, variables, values: LOCAL, fields: {}, body: null });

    expect(draft.headers.find((header) => header.name === "X-API-Key")).toBeUndefined();
  });

  it("knows which hosts are on this machine", () => {
    expect(isLocalUrl("http://localhost:5000/users")).toBe(true);
    expect(isLocalUrl("http://127.0.0.1:8080/users")).toBe(true);
    expect(isLocalUrl("https://api.example.com/users")).toBe(false);
    expect(isLocalUrl("/users")).toBe(false);
  });
});
