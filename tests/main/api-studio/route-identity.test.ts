import { describe, expect, it } from "vitest";

import {
  buildRouteId,
  normalizeRoutePath,
  routeIdentityKey
} from "../../../src/main/api-studio/route-identity";

describe("normalizeRoutePath", () => {
  it("reads every framework's parameter syntax as the same route", () => {
    expect(normalizeRoutePath("/users/{id}/posts")).toBe("/users/{id}/posts");
    expect(normalizeRoutePath("/users/:id/posts")).toBe("/users/{id}/posts");
    expect(normalizeRoutePath("/users/[id]/posts")).toBe("/users/{id}/posts");
    expect(normalizeRoutePath("users/[id]/posts/")).toBe("/users/{id}/posts");
  });

  it("names a catch-all segment after the parameter it captures", () => {
    expect(normalizeRoutePath("/docs/[...slug]")).toBe("/docs/{slug}");
    expect(normalizeRoutePath("/docs/[[...slug]]")).toBe("/docs/{slug}");
  });

  it("drops a query string that is not part of the route", () => {
    expect(normalizeRoutePath("/search?q=term")).toBe("/search");
  });
});

describe("route identity", () => {
  it("keys a route by method and normalized path", () => {
    expect(routeIdentityKey("GET", "/users/:id")).toBe("GET /users/{id}");
  });

  it("keeps an id stable across scans and distinct across projects", () => {
    const first = buildRouteId("/work/api", "GET", "/users/:id", "openapi.yaml");
    const second = buildRouteId("/work/api", "GET", "/users/{id}", "openapi.yaml");
    const other = buildRouteId("/work/other-api", "GET", "/users/{id}", "openapi.yaml");

    expect(first).toBe(second);
    expect(first).not.toBe(other);
  });
});
