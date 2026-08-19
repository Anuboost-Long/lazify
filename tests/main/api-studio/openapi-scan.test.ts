import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { scanProjectRoutes } from "../../../src/main/api-studio";

let projectPath: string;

const SPEC = `openapi: 3.0.3
info:
  title: Demo API
  version: "1.0.0"
servers:
  - url: http://localhost:3000/api
paths:
  /users/{id}:
    parameters:
      - name: id
        in: path
        required: true
        schema: { type: string }
    get:
      operationId: getUser
      summary: Fetch a user
      tags: [users]
      parameters:
        - name: include
          in: query
          schema: { type: array, items: { type: string } }
        - name: X-Request-Id
          in: header
          example: abc-123
      responses:
        "200":
          description: The user
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/User"
        "404": { description: Not found }
  /users:
    post:
      summary: Create a user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/User"
            example: { name: "Dara" }
      responses:
        "201":
          description: Created
components:
  schemas:
    User:
      type: object
      properties:
        id: { type: string }
`;

const TYPED_BODY_SPEC = `openapi: 3.0.3
info:
  title: Orders API
  version: "1.0.0"
paths:
  /orders:
    post:
      summary: Place an order
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/Order"
      responses:
        "201": { description: Created }
components:
  schemas:
    Order:
      type: object
      properties:
        id: { type: string, format: uuid, readOnly: true }
        reference: { type: string }
        quantity: { type: integer }
        price: { type: number }
        express: { type: boolean }
        status: { type: string, enum: [draft, placed] }
        placedAt: { type: string, format: date-time }
        tags: { type: array, items: { type: string } }
        note: { type: string, default: none }
        customer: { $ref: "#/components/schemas/Customer" }
    Customer:
      type: object
      properties:
        name: { type: string }
        vip: { type: boolean }
`;

async function writeProject(files: Record<string, string>) {
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(projectPath, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, "utf8");
  }
}

beforeEach(async () => {
  projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "lazify-api-studio-"));
});

afterEach(async () => {
  await fs.rm(projectPath, { recursive: true, force: true });
});

describe("scanProjectRoutes", () => {
  it("reads every operation in a project's OpenAPI document", async () => {
    await writeProject({ "package.json": "{}", "openapi.yaml": SPEC });

    const result = await scanProjectRoutes(projectPath);

    expect(result.scannersRun).toEqual(["openapi"]);
    expect(result.warnings).toEqual([]);
    expect(result.routes.map((route) => `${route.method} ${route.path}`)).toEqual([
      "POST /users",
      "GET /users/{id}"
    ]);
  });

  it("keeps parameters, headers, body, responses, and the source line of a route", async () => {
    await writeProject({ "package.json": "{}", "openapi.yaml": SPEC });

    const result = await scanProjectRoutes(projectPath);
    const getUser = result.routes.find((route) => route.operationId === "getUser")!;

    expect(getUser.summary).toBe("Fetch a user");
    expect(getUser.tags).toEqual(["users"]);
    expect(getUser.servers).toEqual(["http://localhost:3000/api"]);
    expect(getUser.parameters).toEqual([
      {
        name: "id",
        location: "path",
        required: true,
        description: null,
        schemaType: "string",
        example: null
      },
      {
        name: "include",
        location: "query",
        required: false,
        description: null,
        schemaType: "array<string>",
        example: null
      }
    ]);
    expect(getUser.headers).toEqual([
      { name: "X-Request-Id", value: "abc-123", required: false, description: null }
    ]);
    expect(getUser.responses).toEqual([
      {
        status: "200",
        description: "The user",
        mediaTypes: ["application/json"],
        example: '{\n  "id": "string"\n}'
      },
      { status: "404", description: "Not found", mediaTypes: [], example: null }
    ]);
    expect(getUser.source).toEqual({
      kind: "openapi",
      filePath: "openapi.yaml",
      line: 14,
      adapter: "openapi",
      confidence: "exact"
    });

    const createUser = result.routes.find((route) => route.method === "POST")!;

    expect(createUser.requestBody).toEqual({
      required: true,
      description: null,
      variants: [
        {
          mediaType: "application/json",
          schemaType: "object",
          example: '{\n  "name": "Dara"\n}',
          defaultBody: '{\n  "id": "string"\n}'
        }
      ]
    });
  });

  it("fills the request body from the schema, one default per declared type", async () => {
    await writeProject({ "openapi.yaml": TYPED_BODY_SPEC });

    const { routes } = await scanProjectRoutes(projectPath);
    const [variant] = routes[0].requestBody!.variants;

    expect(JSON.parse(variant.defaultBody!)).toEqual({
      reference: "string",
      quantity: 0,
      price: 0,
      express: true,
      status: "draft",
      placedAt: "1970-01-01T00:00:00Z",
      tags: ["string"],
      note: "none",
      customer: { name: "string", vip: true }
    });
    expect(variant.defaultBody).toBe(JSON.stringify(JSON.parse(variant.defaultBody!), null, 2));
  });

  it("finds a JSON description that is not named after OpenAPI", async () => {
    await writeProject({
      "package.json": "{}",
      "docs/service.json": JSON.stringify({
        openapi: "3.1.0",
        paths: { "/health": { get: { summary: "Health" } } }
      })
    });

    const result = await scanProjectRoutes(projectPath);

    expect(result.routes).toHaveLength(1);
    expect(result.routes[0].path).toBe("/health");
    expect(result.routes[0].source.filePath).toBe("docs/service.json");
  });

  it("reports an unreadable or unsupported document instead of dropping it", async () => {
    await writeProject({
      "package.json": "{}",
      "swagger.json": JSON.stringify({ swagger: "2.0", paths: {} })
    });

    const result = await scanProjectRoutes(projectPath);

    expect(result.routes).toEqual([]);
    expect(result.warnings[0].message).toMatch(/Swagger 2\.0/);
  });

  it("says so when a project has no API description at all", async () => {
    await writeProject({ "package.json": "{}", "src/index.ts": "export const value = 1;" });

    const result = await scanProjectRoutes(projectPath);

    expect(result.scannersRun).toEqual([]);
    expect(result.warnings[0].message).toMatch(/No API description/);
  });

  it("refuses a project folder that is gone", async () => {
    await expect(scanProjectRoutes(path.join(projectPath, "missing"))).rejects.toThrow(
      /no longer exists/
    );
  });
});
