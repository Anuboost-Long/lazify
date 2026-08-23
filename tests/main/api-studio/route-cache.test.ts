import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  readRouteDetails,
  readRouteScan,
  routeDetailPath,
  routeIndexPath,
  saveRouteScan,
  scanProjectRoutes
} from "../../../src/main/api-studio";

let projectPath: string;

const SPEC = `openapi: 3.0.3
paths:
  /users:
    get:
      summary: List users
`;

beforeEach(async () => {
  projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "lazify-route-cache-"));
  await fs.writeFile(path.join(projectPath, "openapi.yaml"), SPEC, "utf8");
});

afterEach(async () => {
  await fs.rm(projectPath, { recursive: true, force: true });
});

describe("saved route collections", () => {
  it("keeps the bulk in a compressed folder, read only when a route is opened", async () => {
    const saved = await saveRouteScan(await scanProjectRoutes(projectPath));
    const summary = saved.routes[0];

    expect(summary.folder).toBe("users");
    expect(summary).not.toHaveProperty("parameters");
    expect(routeDetailPath(projectPath, "users")).toBe(
      path.join(projectPath, ".lazify", "api-studio", "routes", "users.json.gz")
    );

    const details = await readRouteDetails(projectPath, "users");

    expect(details.map((detail) => detail.id)).toEqual([summary.id]);
    expect(details[0].responses).toHaveLength(0);
  });

  it("clears a folder file whose routes are all gone", async () => {
    await saveRouteScan(await scanProjectRoutes(projectPath));

    await fs.writeFile(
      path.join(projectPath, "openapi.yaml"),
      "openapi: 3.0.3\npaths:\n  /orders:\n    get:\n      summary: List orders\n",
      "utf8"
    );

    await saveRouteScan(await scanProjectRoutes(projectPath));

    expect(await fs.readdir(path.join(projectPath, ".lazify", "api-studio", "routes"))).toEqual([
      "orders.json.gz"
    ]);
  });

  it("removes the single file written by the previous layout", async () => {
    const superseded = path.join(projectPath, ".lazify", "api-studio-routes.json");

    await fs.mkdir(path.dirname(superseded), { recursive: true });
    await fs.writeFile(superseded, "{}", "utf8");

    await saveRouteScan(await scanProjectRoutes(projectPath));

    expect(await fs.access(superseded).then(() => true).catch(() => false)).toBe(false);
  });

  it("writes one JSON file into the project and reads it back without rescanning", async () => {
    const scanned = await scanProjectRoutes(projectPath);
    const saved = await saveRouteScan(scanned);

    expect(routeIndexPath(projectPath)).toBe(
      path.join(projectPath, ".lazify", "api-studio", "routes.json")
    );
    expect(saved.routes).toHaveLength(1);
    expect(saved.scannedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(saved.filesInspected).toBe(1);

    const reopened = await readRouteScan(projectPath);

    expect(reopened?.routes).toEqual(saved.routes);
    expect(reopened?.scannedAt).toBe(saved.scannedAt);
  });

  it("reads back nothing when the project has never been scanned", async () => {
    expect(await readRouteScan(projectPath)).toBeNull();
  });

  it("keeps route ids stable across a rescan, so saved selections still resolve", async () => {
    const first = await saveRouteScan(await scanProjectRoutes(projectPath));
    const second = await saveRouteScan(await scanProjectRoutes(projectPath));

    expect(second.routes.map((route) => route.id)).toEqual(first.routes.map((route) => route.id));
  });

  it("updates the one file in place when a rescan finds new routes", async () => {
    const first = await saveRouteScan(await scanProjectRoutes(projectPath));

    await fs.appendFile(
      path.join(projectPath, "openapi.yaml"),
      "  /orders:\n    post:\n      summary: Create order\n",
      "utf8"
    );

    const second = await saveRouteScan(await scanProjectRoutes(projectPath));

    expect(await fs.readdir(path.join(projectPath, ".lazify", "api-studio"))).toEqual([
      "routes",
      "routes.json"
    ]);
    expect(second.routes.map((route) => route.path)).toEqual(["/orders", "/users"]);
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.scannedAt).not.toBe(first.scannedAt);
  });

  it("keeps the day a route was first seen, and dates only the new ones to this scan", async () => {
    const first = await saveRouteScan(await scanProjectRoutes(projectPath));

    await fs.appendFile(
      path.join(projectPath, "openapi.yaml"),
      "  /orders:\n    post:\n      summary: Create order\n",
      "utf8"
    );

    const second = await saveRouteScan(await scanProjectRoutes(projectPath));
    const users = second.routes.find((route) => route.path === "/users")!;
    const orders = second.routes.find((route) => route.path === "/orders")!;

    expect(users.firstSeenAt).toBe(first.routes[0].firstSeenAt);
    expect(orders.firstSeenAt).toBe(second.scannedAt);
  });

  it("carries forward fields the scanner does not own, and refreshes the ones it does", async () => {
    const first = await saveRouteScan(await scanProjectRoutes(projectPath));
    const filePath = routeIndexPath(projectPath);
    const stored = JSON.parse(await fs.readFile(filePath, "utf8"));

    stored.routes[0].note = "Needs an auth token";
    await fs.writeFile(filePath, JSON.stringify(stored), "utf8");


    await fs.writeFile(
      path.join(projectPath, "openapi.yaml"),
      SPEC.replace("List users", "List every user"),
      "utf8"
    );

    const second = await saveRouteScan(await scanProjectRoutes(projectPath));

    expect((second.routes[0] as { note?: string }).note).toBe("Needs an auth token");
    expect(second.routes[0].summary).toBe("List every user");
    expect(second.routes[0].firstSeenAt).toBe(first.routes[0].firstSeenAt);

    const reopened = await readRouteScan(projectPath);

    expect((reopened!.routes[0] as { note?: string }).note).toBe("Needs an auth token");
  });

  it("drops a route that no longer exists in the project", async () => {
    await saveRouteScan(await scanProjectRoutes(projectPath));

    await fs.writeFile(
      path.join(projectPath, "openapi.yaml"),
      "openapi: 3.0.3\npaths:\n  /orders:\n    post:\n      summary: Create order\n",
      "utf8"
    );

    const second = await saveRouteScan(await scanProjectRoutes(projectPath));

    expect(second.routes.map((route) => route.path)).toEqual(["/orders"]);
  });

  it("ignores a file left behind by another version or another folder", async () => {
    const filePath = routeIndexPath(projectPath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    await fs.writeFile(filePath, JSON.stringify({ version: 99, routes: [] }), "utf8");
    expect(await readRouteScan(projectPath)).toBeNull();

    await fs.writeFile(
      filePath,
      JSON.stringify({ version: 3, projectPath: "/somewhere/else", routes: [] }),
      "utf8"
    );
    expect(await readRouteScan(projectPath)).toBeNull();

    await fs.writeFile(filePath, "{ not json", "utf8");
    expect(await readRouteScan(projectPath)).toBeNull();
  });
});
