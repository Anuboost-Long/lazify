import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { deriveEnvironmentVariables, scanProjectRoutes } from "../../../src/main/api-studio";

let projectPath: string;

const NEST_CONTROLLER = `import { Controller, Get, Post, Body } from '@nestjs/common';

@Controller('invoices')
export class InvoicesController {
  @Get()
  findAll() {
    return [];
  }

  @Post()
  create(@Body() body: CreateInvoiceDto) {
    return body;
  }
}
`;

const EXPRESS_ROUTER = `const express = require('express');
const router = express.Router();

router.get('/reports', listReports);

app.use('/api/billing', router);
`;

async function writeProject(files: Record<string, string>) {
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(projectPath, relativePath);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, "utf8");
  }
}

const manifest = (dependencies: Record<string, string>) =>
  JSON.stringify({ name: "part", dependencies });

beforeEach(async () => {
  projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "lazify-monorepo-"));
});

afterEach(async () => {
  await fs.rm(projectPath, { recursive: true, force: true });
});

describe("a repository that holds more than one project", () => {
  it("finds an API a root manifest never mentions", async () => {
    await writeProject({
      "package.json": manifest({ electron: "^30.0.0" }),
      "frontend/package.json": manifest({ react: "^18.0.0", vite: "^5.0.0" }),
      "frontend/src/api.ts": "export const load = () => fetch('/invoices');",
      "backend/package.json": manifest({ "@nestjs/common": "^11.0.0" }),
      "backend/src/invoices/invoices.controller.ts": NEST_CONTROLLER
    });

    const result = await scanProjectRoutes(projectPath);

    expect(result.routes.map((route) => `${route.method} ${route.path}`)).toEqual([
      "GET /invoices",
      "POST /invoices"
    ]);
    expect(result.routes.every((route) => route.workspace === "backend")).toBe(true);
  });

  it("finds each project's routes once, not once per project above it", async () => {
    await writeProject({
      "package.json": manifest({ electron: "^30.0.0" }),
      "backend/package.json": manifest({ "@nestjs/common": "^11.0.0" }),
      "backend/src/invoices/invoices.controller.ts": NEST_CONTROLLER
    });

    const result = await scanProjectRoutes(projectPath);

    expect(result.routes).toHaveLength(2);
  });

  it("keeps two services apart, down to the base URL each one needs", async () => {
    await writeProject({
      "package.json": manifest({ turbo: "^2.0.0" }),
      "services/invoices/package.json": manifest({ "@nestjs/common": "^11.0.0" }),
      "services/invoices/src/invoices.controller.ts": NEST_CONTROLLER,
      "services/billing/package.json": manifest({ express: "^4.18.0" }),
      "services/billing/routes.js": EXPRESS_ROUTER
    });

    const result = await scanProjectRoutes(projectPath);
    const workspaces = new Set(result.routes.map((route) => route.workspace));
    const variables = deriveEnvironmentVariables(result.routes).map((variable) => variable.name);

    expect(workspaces).toEqual(new Set(["services/invoices", "services/billing"]));
    expect(variables).toEqual(
      expect.arrayContaining(["servicesInvoicesBaseUrl", "servicesBillingBaseUrl"])
    );
    expect(variables).not.toContain("baseUrl");
  });

  it("reads the same route twice from a build directory as one route", async () => {
    await writeProject({
      "package.json": manifest({ electron: "^30.0.0" }),
      "backend/package.json": manifest({ "@nestjs/common": "^11.0.0" }),
      "backend/src/invoices/invoices.controller.ts": NEST_CONTROLLER,
      ".electron-build/backend/package.json": manifest({ "@nestjs/common": "^11.0.0" }),
      ".electron-build/backend/src/invoices/invoices.controller.ts": NEST_CONTROLLER
    });

    const result = await scanProjectRoutes(projectPath);

    expect(result.routes).toHaveLength(2);
    expect(
      result.routes.every((route) => !route.source.filePath?.includes(".electron-build"))
    ).toBe(true);
  });

  it("reads the port a service states in its own env file", async () => {
    await writeProject({
      "package.json": manifest({ electron: "^30.0.0" }),
      "backend/package.json": manifest({ "@nestjs/common": "^11.0.0" }),
      "backend/.env": "PORT=4500\nDATABASE_URL=postgres://localhost/db\n",
      "backend/src/main.ts": "const port = process.env.PORT || 3001;\napp.listen(port);\n",
      "backend/src/invoices/invoices.controller.ts": NEST_CONTROLLER
    });

    const result = await scanProjectRoutes(projectPath);

    /** The env file states it; the fallback in the code does not overrule it. */
    expect(result.routes[0].servers[0]).toBe("http://localhost:4500");
    expect(
      deriveEnvironmentVariables(result.routes).find((one) => one.name === "backendBaseUrl")
        ?.defaultValue
    ).toBe("http://localhost:4500");
  });

  it("reads the port from the compose file that runs the service", async () => {
    await writeProject({
      "package.json": manifest({ electron: "^30.0.0" }),
      "docker-compose.yml": `services:
  database:
    image: postgres
    ports:
      - "5432:5432"
  backend:
    build:
      context: ./backend
    ports:
      - "4500:4500"
`,
      "backend/package.json": manifest({ "@nestjs/common": "^11.0.0" }),
      "backend/src/invoices/invoices.controller.ts": NEST_CONTROLLER
    });

    const result = await scanProjectRoutes(projectPath);

    expect(result.routes[0].servers).toEqual(["http://localhost:4500"]);
  });

  it("falls back to the port the entry point starts on", async () => {
    await writeProject({
      "package.json": manifest({ "@nestjs/common": "^11.0.0" }),
      "src/main.ts": "async function bootstrap() {\n  await app.listen(3333);\n}\n",
      "src/invoices/invoices.controller.ts": NEST_CONTROLLER
    });

    const result = await scanProjectRoutes(projectPath);

    expect(result.routes[0].servers).toEqual(["http://localhost:3333"]);
  });

  it("leaves a repository that is one project exactly as it was", async () => {
    await writeProject({
      "package.json": manifest({ "@nestjs/common": "^11.0.0" }),
      "src/invoices/invoices.controller.ts": NEST_CONTROLLER
    });

    const result = await scanProjectRoutes(projectPath);
    const variables = deriveEnvironmentVariables(result.routes).map((variable) => variable.name);

    expect(result.routes.every((route) => route.workspace === "")).toBe(true);
    expect(variables).toContain("baseUrl");
  });
});
