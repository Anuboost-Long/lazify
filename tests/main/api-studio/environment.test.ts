import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
	buildRequest,
	deriveEnvironmentVariables,
	scanProjectRoutes,
	variablesForRoute,
} from "../../../src/main/api-studio";

let projectPath: string;

const SECURED_SPEC = `openapi: 3.0.3
servers:
  - url: https://api.example.com/v1
security:
  - bearerAuth: []
paths:
  /orders:
    get:
      summary: List orders
      parameters:
        - name: X-Tenant
          in: header
          required: true
      responses:
        "200": { description: ok }
    post:
      security:
        - apiKeyAuth: []
      responses:
        "201": { description: created }
  /health:
    get:
      security: []
      responses:
        "200": { description: ok }
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
    apiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
`;

const SECURED_CONTROLLER = `using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("[controller]")]
[Authorize]
public class BillingController : ControllerBase
{
    [HttpGet("Invoices")]
    public IActionResult Invoices() => Ok();

    [AllowAnonymous]
    [HttpGet("Ping")]
    public IActionResult Ping() => Ok();
}
`;

async function writeProject(files: Record<string, string>) {
	for (const [relativePath, content] of Object.entries(files)) {
		const absolutePath = path.join(projectPath, relativePath);
		await fs.mkdir(path.dirname(absolutePath), { recursive: true });
		await fs.writeFile(absolutePath, content, "utf8");
	}
}

beforeEach(async () => {
	projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "lazify-api-env-"));
});

afterEach(async () => {
	await fs.rm(projectPath, { recursive: true, force: true });
});

describe("what a route needs before it can be sent", () => {
	it("reads the security scheme each operation declares, and the ones that opt out", async () => {
		await writeProject({ "openapi.yaml": SECURED_SPEC });

		const { routes } = await scanProjectRoutes(projectPath);
		const list = routes.find((route) => route.method === "GET" && route.path === "/orders")!;
		const create = routes.find((route) => route.method === "POST")!;
		const health = routes.find((route) => route.path === "/health")!;

		expect(list.security).toEqual([
			{ kind: "bearer", schemeName: "bearerAuth", location: "header", parameterName: "Authorization" },
		]);
		expect(create.security).toEqual([
			{ kind: "apiKey", schemeName: "apiKeyAuth", location: "header", parameterName: "X-API-Key" },
		]);
		expect(health.security).toEqual([]);
	});

	it("treats [Authorize] on a controller as inherited, and [AllowAnonymous] as an escape", async () => {
		await writeProject({
			"Api.csproj": '<Project Sdk="Microsoft.NET.Sdk.Web"></Project>',
			"Controllers/BillingController.cs": SECURED_CONTROLLER,
		});

		const { routes } = await scanProjectRoutes(projectPath);

		expect(routes.find((route) => route.path === "/Billing/Invoices")!.security).toEqual([
			{ kind: "bearer", schemeName: "Authorize", location: "header", parameterName: "Authorization" },
		]);
		expect(routes.find((route) => route.path === "/Billing/Ping")!.security).toEqual([]);
	});
});

describe("the environment derived from a collection", () => {
	it("collects a base URL, one variable per scheme, and required headers", async () => {
		await writeProject({ "openapi.yaml": SECURED_SPEC });

		const { routes } = await scanProjectRoutes(projectPath);
		const variables = deriveEnvironmentVariables(routes);

		expect(variables.map((variable) => variable.name)).toEqual([
			"baseUrl",
			"Authorization",
			"X-API-Key",
			"X-Tenant",
		]);

		const baseUrl = variables.find((variable) => variable.name === "baseUrl")!;
		const token = variables.find((variable) => variable.name === "Authorization")!;

		expect(baseUrl).toMatchObject({
			secret: false,
			location: "url",
			defaultValue: "https://api.example.com/v1",
			routeCount: 3,
		});
		expect(token).toMatchObject({ secret: true, location: "header", parameterName: "Authorization" });
		expect(variables.find((variable) => variable.name === "X-Tenant")!.secret).toBe(false);
	});

	it("names only what the open route needs, not the whole collection", async () => {
		await writeProject({ "openapi.yaml": SECURED_SPEC });

		const { routes } = await scanProjectRoutes(projectPath);

		expect(variablesForRoute(routes.find((route) => route.path === "/health")!)).toEqual(["baseUrl"]);
		expect(
			variablesForRoute(routes.find((route) => route.method === "GET" && route.path === "/orders")!),
		).toEqual(["baseUrl", "authorization", "xTenant"]);
	});

	it("builds the request URL from a typed value, falling back to what the project declared", async () => {
		await writeProject({ "openapi.yaml": SECURED_SPEC });

		const { routes } = await scanProjectRoutes(projectPath);
		const variables = deriveEnvironmentVariables(routes);
		const health = routes.find((route) => route.path === "/health")!;

		const urlWith = (values: Record<string, string>) =>
			buildRequest({ route: health, variables, values, fields: {}, body: null }).url;

		expect(urlWith({})).toBe("https://api.example.com/v1/health");
		expect(urlWith({ baseUrl: "http://localhost:5000/" })).toBe("http://localhost:5000/health");
	});
});
