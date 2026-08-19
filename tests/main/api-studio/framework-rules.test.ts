import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { deriveEnvironmentVariables, scanProjectRoutes } from "../../../src/main/api-studio";

let projectPath: string;

const NEST_CONTROLLER = `import { Controller, Get, Post, Body, Param, Query, Headers, UseGuards } from '@nestjs/common';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  findAll(@Query('page') page: number, @Query('search') search?: string) {
    return this.users.findAll(page, search);
  }

  @Get(':id/orders/:orderId')
  findOrder(@Param('id') id: string, @Param('orderId') orderId: string) {
    return this.users.findOrder(id, orderId);
  }

  @Post()
  create(@Body() body: CreateUserDto, @Headers('x-tenant') tenant: string) {
    return this.users.create(body, tenant);
  }

  @Public()
  @Get('health')
  health() {
    return 'ok';
  }
}
`;

const EXPRESS_ROUTER = `const express = require('express');
const router = express.Router();

router.get('/', listInvoices);

router.get('/:invoiceId', requireAuth, (req, res) => res.json({}));

router.post('/:invoiceId/lines', requireAuth, async (req, res) => {
  res.status(201).json({});
});

router.delete(buildPath('legacy'), removeInvoice);

app.use('/api/invoices', router);

module.exports = router;
`;

const NEST_MAIN = `import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Demo')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-API-KEY', in: 'header' }, 'api-key')
    .addGlobalSecurity('api-key')
    .build();

  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
  await app.listen(3000);
}
bootstrap();
`;

const EXPRESS_SWAGGER = `const swaggerJsdoc = require('swagger-jsdoc');

const definition = {
  openapi: '3.0.0',
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer' },
      ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-KEY' }
    }
  },
  security: [{ ApiKeyAuth: [] }]
};

module.exports = swaggerJsdoc({ definition, apis: ['./routes/*.js'] });
`;

const EXPRESS_KEY_MIDDLEWARE = `function apiKeyGuard(req, res, next) {
  const provided = req.headers['x-client-key'];

  if (!provided) return res.status(401).json({ error: 'missing key' });

  return next();
}

app.use(apiKeyGuard);

module.exports = apiKeyGuard;
`;

async function writeProject(files: Record<string, string>) {
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(projectPath, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, "utf8");
  }
}

function packageJson(dependencies: Record<string, string>) {
  return JSON.stringify({ name: "demo", dependencies });
}

beforeEach(async () => {
  projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "lazify-framework-"));
});

afterEach(async () => {
  await fs.rm(projectPath, { recursive: true, force: true });
});

describe("NestJS, from its rule set alone", () => {
  it("joins the controller prefix to each decorator's path", async () => {
    await writeProject({
      "package.json": packageJson({ "@nestjs/common": "^10.0.0" }),
      "src/users/users.controller.ts": NEST_CONTROLLER
    });

    const result = await scanProjectRoutes(projectPath);

    expect(result.scannersRun).toEqual(["nestjs"]);
    expect(result.routes.map((route) => `${route.method} ${route.path}`)).toEqual([
      "GET /users",
      "POST /users",
      "GET /users/health",
      "GET /users/{id}/orders/{orderId}"
    ]);

  });

  it("binds decorator parameters by the name the decorator carries", async () => {
    await writeProject({
      "package.json": packageJson({ "@nestjs/common": "^10.0.0" }),
      "src/users/users.controller.ts": NEST_CONTROLLER
    });

    const result = await scanProjectRoutes(projectPath);
    const list = result.routes.find((route) => route.path === "/users" && route.method === "GET")!;
    const create = result.routes.find((route) => route.method === "POST")!;
    const nested = result.routes.find((route) => route.path.includes("orders"))!;

    expect(list.parameters.map((parameter) => `${parameter.name}:${parameter.schemaType}`)).toEqual([
      "page:number",
      "search:string"
    ]);
    expect(list.parameters[1].required).toBe(false);
    expect(nested.parameters.map((parameter) => parameter.name)).toEqual(["id", "orderId"]);
    expect(create.requestBody?.variants[0].schemaType).toBe("CreateUserDto");
    expect(create.headers).toEqual([
      { name: "x-tenant", value: null, required: true, description: null }
    ]);
  });

  it("reads a guard as auth, and the class-level guard as inherited", async () => {
    await writeProject({
      "package.json": packageJson({ "@nestjs/common": "^10.0.0" }),
      "src/users/users.controller.ts": NEST_CONTROLLER
    });

    const result = await scanProjectRoutes(projectPath);

    expect(result.routes.find((route) => route.path === "/users")!.security).toEqual([
      { kind: "bearer", schemeName: "UseGuards", location: "header", parameterName: "Authorization" }
    ]);
    expect(result.routes.find((route) => route.path === "/users/health")!.security).toEqual([]);
    expect(deriveEnvironmentVariables(result.routes).map((variable) => variable.name)).toEqual([
      "baseUrl",
      "bearerToken",
      "xTenant"
    ]);
  });
});

describe("Express, from its rule set alone", () => {
  it("applies the mount path a router is used under", async () => {
    await writeProject({
      "package.json": packageJson({ express: "^4.19.0" }),
      "src/routes/invoices.js": EXPRESS_ROUTER
    });

    const result = await scanProjectRoutes(projectPath);

    expect(result.scannersRun).toEqual(["express"]);
    expect(result.routes.map((route) => `${route.method} ${route.path}`)).toEqual([
      "GET /api/invoices",
      "GET /api/invoices/{invoiceId}",
      "POST /api/invoices/{invoiceId}/lines"
    ]);
  });

  it("reads middleware as auth and reports a path it cannot resolve", async () => {
    await writeProject({
      "package.json": packageJson({ express: "^4.19.0" }),
      "src/routes/invoices.js": EXPRESS_ROUTER
    });

    const result = await scanProjectRoutes(projectPath);
    const byId = result.routes.find((route) => route.path === "/api/invoices/{invoiceId}")!;

    expect(byId.parameters.map((parameter) => parameter.name)).toEqual(["invoiceId"]);
    expect(byId.security[0]).toMatchObject({ kind: "bearer", parameterName: "Authorization" });
    expect(byId.source.confidence).toBe("inferred");
    expect(result.unsupported[0].reason).toMatch(/delete is called with a path/);
  });
});

describe("a project's own security declaration, whatever the framework", () => {
  it("reads NestJS's document builder and requires the key it makes global", async () => {
    await writeProject({
      "package.json": packageJson({ "@nestjs/common": "^10.0.0" }),
      "src/users/users.controller.ts": NEST_CONTROLLER,
      "src/main.ts": NEST_MAIN
    });

    const result = await scanProjectRoutes(projectPath);
    const list = result.routes.find((route) => route.method === "GET" && route.path === "/users")!;
    const health = result.routes.find((route) => route.path.endsWith("health"))!;
    const names = deriveEnvironmentVariables(result.routes).map((variable) => variable.name);

    expect(list.security).toContainEqual({
      kind: "apiKey",
      schemeName: "api-key",
      location: "header",
      parameterName: "X-API-KEY"
    });
    expect(health.security).toEqual([]);
    expect(names).toEqual(expect.arrayContaining(["xApiKey", "bearerToken"]));
    expect(names).not.toContain("authorization");
  });

  it("reads an Express swagger definition and applies what its security names", async () => {
    await writeProject({
      "package.json": packageJson({ express: "^4.18.0" }),
      "routes/invoices.js": EXPRESS_ROUTER,
      "swagger.js": EXPRESS_SWAGGER
    });

    const result = await scanProjectRoutes(projectPath);

    for (const route of result.routes) {
      expect(route.security.map((security) => security.parameterName)).toContain("X-API-KEY");
    }
  });

  it("falls back to the header an Express guard reads when nothing declares it", async () => {
    await writeProject({
      "package.json": packageJson({ express: "^4.18.0" }),
      "routes/invoices.js": EXPRESS_ROUTER,
      "middleware/api-key.js": EXPRESS_KEY_MIDDLEWARE
    });

    const result = await scanProjectRoutes(projectPath);

    expect(result.routes[0].security).toContainEqual({
      kind: "apiKey",
      schemeName: "ApiKey",
      location: "header",
      parameterName: "x-client-key"
    });
  });
});
