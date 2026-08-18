import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { scanProjectRoutes } from "../../../src/main/api-studio";

let projectPath: string;

const CONTROLLER = `using Microsoft.AspNetCore.Mvc;

namespace Demo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserService _users;

    public UsersController(IUserService users) => _users = users;

    /// <summary>
    /// Lists every user.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<User>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] int page, [FromQuery] string? search, CancellationToken token)
    {
        return Ok(await _users.ListAsync(page, search, token));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<User>> GetById(Guid id) => Ok(await _users.FindAsync(id));

    [HttpPost]
    public async Task<IActionResult> Create(CreateUserRequest request, [FromHeader(Name = "X-Tenant")] string tenant)
    {
        return Created();
    }

    [HttpDelete("{id}/sessions/{sessionId?}")]
    public IActionResult EndSession(Guid id, string? sessionId) => NoContent();
}
`;

const MINIMAL_API = `var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var todos = app.MapGroup("/api/todos");

todos.MapGet("/", async (TodoDb db) => await db.Todos.ToListAsync())
    .WithSummary("List todos");

todos.MapGet("/{id:int}", async (int id, TodoDb db) => await db.Todos.FindAsync(id));

todos.MapPost("/", async (Todo todo, TodoDb db) => Results.Created());

app.MapDelete(BuildPath("legacy"), () => Results.NoContent());

app.Run();
`;

const LAUNCH_SETTINGS = `\uFEFF${JSON.stringify({
  profiles: { https: { applicationUrl: "https://localhost:7183;http://localhost:5183" } }
})}`;

async function writeProject(files: Record<string, string>) {
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(projectPath, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, "utf8");
  }
}

async function scanDotnetProject(files: Record<string, string>) {
  await writeProject({
    "Demo.Api.csproj": "<Project Sdk=\"Microsoft.NET.Sdk.Web\"></Project>",
    ...files
  });

  return scanProjectRoutes(projectPath);
}

beforeEach(async () => {
  projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "lazify-aspnet-"));
});

afterEach(async () => {
  await fs.rm(projectPath, { recursive: true, force: true });
});

describe("ASP.NET controller discovery", () => {
  it("builds each action's route from the controller and action templates", async () => {
    const result = await scanDotnetProject({ "Controllers/UsersController.cs": CONTROLLER });

    expect(result.scannersRun).toEqual(["aspnet"]);
    expect(result.routes.map((route) => `${route.method} ${route.path}`)).toEqual([
      "GET /api/Users",
      "POST /api/Users",
      "GET /api/Users/{id}",
      "DELETE /api/Users/{id}/sessions/{sessionId}"
    ]);
  });

  it("keeps the doc summary, bound parameters, body, and declared responses", async () => {
    const result = await scanDotnetProject({ "Controllers/UsersController.cs": CONTROLLER });
    const list = result.routes.find((route) => route.method === "GET" && route.path === "/api/Users")!;

    expect(list.summary).toBe("Lists every user.");
    expect(list.parameters).toEqual([
      {
        name: "page",
        location: "query",
        required: true,
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
    ]);
    expect(list.responses).toEqual([{ status: "200", description: null, mediaTypes: [] }]);

    const create = result.routes.find((route) => route.method === "POST")!;

    expect(create.requestBody?.variants).toEqual([
      { mediaType: "application/json", schemaType: "CreateUserRequest", example: null }
    ]);
    expect(create.headers).toEqual([
      { name: "X-Tenant", value: null, required: true, description: null }
    ]);
  });

  it("types a route constraint and marks an optional segment optional", async () => {
    const result = await scanDotnetProject({ "Controllers/UsersController.cs": CONTROLLER });
    const byId = result.routes.find((route) => route.path === "/api/Users/{id}")!;
    const endSession = result.routes.find((route) => route.path.includes("sessions"))!;

    expect(byId.parameters[0].schemaType).toBe("string (uuid)");
    expect(byId.source).toMatchObject({
      kind: "scanner",
      adapter: "aspnet",
      confidence: "exact",
      filePath: "Controllers/UsersController.cs"
    });
    expect(endSession.parameters.map((parameter) => parameter.required)).toEqual([true, false]);
  });
});

const SPLIT_DECLARATION = `using Microsoft.AspNetCore.Mvc;

[Route("[controller]")]
[ApiController]
public class ReportsController : ControllerBase
{
    [HttpGet("Fetch")]
    [SwaggerOperation(
        Summary = "Fetch reports",
        Tags = new[] { "Reports" }
    )]
    public async Task<IActionResult> HandleFetchReports
    ([FromQuery] ReportQuery query)
    {
        return Ok();
    }

    [HttpGet("Latest")]
    [HttpHead("Latest")]
    public IActionResult Latest() => Ok();
}

public class PagingQuery
{
    public int Page { get; set; }
    public int Limit { get; set; }
}

public class ReportQuery : PagingQuery
{
    public string? Search { get; set; }
    public int Limit { get; set; }
}
`;

describe("ASP.NET shapes a real project uses", () => {
  it("reads an action whose parameter list starts on the next line, past a multi-line attribute", async () => {
    const result = await scanDotnetProject({ "Controllers/ReportsController.cs": SPLIT_DECLARATION });

    expect(result.routes.map((route) => `${route.method} ${route.path}`)).toEqual([
      "GET /Reports/Fetch",
      "GET /Reports/Latest",
      "HEAD /Reports/Latest"
    ]);
  });

  it("expands a query DTO into its own and inherited properties, without repeating an override", async () => {
    const result = await scanDotnetProject({ "Controllers/ReportsController.cs": SPLIT_DECLARATION });
    const fetch = result.routes.find((route) => route.path === "/Reports/Fetch")!;

    expect(fetch.parameters.map((parameter) => `${parameter.name}:${parameter.schemaType}`)).toEqual([
      "Page:integer",
      "Limit:integer",
      "Search:string"
    ]);
  });
});

describe("ASP.NET minimal API discovery", () => {
  it("resolves route groups and reports a path it cannot resolve", async () => {
    const result = await scanDotnetProject({
      "Program.cs": MINIMAL_API,
      "Properties/launchSettings.json": LAUNCH_SETTINGS
    });

    expect(result.routes.map((route) => `${route.method} ${route.path}`)).toEqual([
      "GET /api/todos",
      "POST /api/todos",
      "GET /api/todos/{id}"
    ]);
    expect(result.unsupported[0].reason).toMatch(/MapDelete is called with a path/);
  });

  it("takes the servers from launchSettings and the summary from the endpoint", async () => {
    const result = await scanDotnetProject({
      "Program.cs": MINIMAL_API,
      "Properties/launchSettings.json": LAUNCH_SETTINGS
    });
    const list = result.routes.find((route) => route.method === "GET" && route.path === "/api/todos")!;

    expect(list.servers).toEqual(["https://localhost:7183", "http://localhost:5183"]);
    expect(list.summary).toBe("List todos");
    expect(list.source.confidence).toBe("inferred");
  });

  it("prefers an OpenAPI document when the project also checks one in", async () => {
    const result = await scanDotnetProject({
      "Program.cs": MINIMAL_API,
      "openapi.json": JSON.stringify({
        openapi: "3.0.0",
        paths: { "/api/todos": { get: { summary: "From the document" } } }
      })
    });

    expect(result.scannersRun).toEqual(["openapi", "aspnet"]);
    expect(result.routes.find((route) => route.path === "/api/todos")?.summary).toBe(
      "From the document"
    );
  });
});
