import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { deriveEnvironmentVariables, scanProjectRoutes } from "../../../src/main/api-studio";

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

const REQUEST_MODEL = `namespace Demo.Api.Models;

public class CreateUserRequest
{
    public string Name { get; set; }
    public int Age { get; set; }
    public bool Active { get; set; }
    public Guid TenantId { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<string> Roles { get; set; }
    public AddressRequest Address { get; set; }
}

public class AddressRequest
{
    public string City { get; set; }
}
`;

const API_KEY_CONTROLLER = `using Microsoft.AspNetCore.Mvc;

namespace Demo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[ApiKey("X-Client-Key")]
public class WebhooksController : ControllerBase
{
    [HttpPost]
    public IActionResult Receive() => Ok();

    [HttpGet("health")]
    [AllowAnonymous]
    public IActionResult Health() => Ok();
}

[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    [HttpGet]
    [Authorize]
    [RequireApiKey]
    public IActionResult List() => Ok();
}
`;

const GLOBAL_KEY_PROGRAM = `using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers(options =>
{
    options.Filters.Add<ApiKeyAuthFilter>();
});

builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("ApiKey", new OpenApiSecurityScheme
    {
        Name = "X-Client-Key",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey
    });
});

var app = builder.Build();
app.Run();
`;

const SWAGGER_TWO_SCHEMES = `using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers(options =>
{
    options.Filters.Add<ApiKeyAuthFilter>();
});

builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    options.AddSecurityDefinition("ApiKeyAuth", new OpenApiSecurityScheme
    {
        Description = "API Key needed to access the endpoints",
        Name = "X-API-KEY",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "ApiKeyAuth"
                }
            },
            new string[] { }
        }
    });
});

var app = builder.Build();
app.Run();
`;

const KEY_FILTER = `using Microsoft.AspNetCore.Mvc.Filters;

namespace Demo.Api.Security;

public class ApiKeyAuthFilter : IAuthorizationFilter
{
    private const string HeaderName = "X-Tenant-Key";

    public void OnAuthorization(AuthorizationFilterContext context)
    {
        if (!context.HttpContext.Request.Headers.TryGetValue(HeaderName, out var provided))
        {
            context.Result = new UnauthorizedResult();
        }
    }
}
`;

const ANONYMOUS_CONTROLLER = `using Microsoft.AspNetCore.Mvc;

namespace Demo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class PingController : ControllerBase
{
    [HttpGet]
    public IActionResult Ping() => Ok();
}
`;

const ENUM_MODEL = `using System.Text.Json.Serialization;

namespace Demo.Api.Models;

public enum UserStatus
{
    Unknown = 0,
    Active = 1
}

public enum Priority
{
    Low = 1,
    Normal = 0,
    High = 2
}

public class CreateUserRequest
{
    [JsonPropertyName("full_name")]
    public string FullName { get; set; }
    public UserStatus Status { get; set; }
    public Priority Priority { get; set; }
    public int RetryCount { get; set; }
}
`;

function programWith(configuration: string) {
  return `var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(options =>
{
${configuration}
});

var app = builder.Build();
app.Run();
`;
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
    expect(list.responses).toEqual([
      { status: "200", description: null, mediaTypes: [], example: null }
    ]);

    const create = result.routes.find((route) => route.method === "POST")!;

    expect(create.requestBody?.variants).toEqual([
      {
        mediaType: "application/json",
        schemaType: "CreateUserRequest",
        example: null,
        defaultBody: null
      }
    ]);
    expect(create.headers).toEqual([
      { name: "X-Tenant", value: null, required: true, description: null }
    ]);
  });

  it("says nothing about a body whose model the scan never saw", async () => {
    const result = await scanDotnetProject({ "Controllers/UsersController.cs": CONTROLLER });
    const create = result.routes.find((route) => route.method === "POST")!;

    expect(create.requestBody?.variants[0]).toMatchObject({
      schemaType: "CreateUserRequest",
      defaultBody: null
    });
  });

  it("reads a model whose binding names it through its namespace", async () => {
    const result = await scanDotnetProject({
      "Controllers/LoginController.cs": `using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class LoginController : ControllerBase
{
    [HttpPost]
    public IActionResult Login([FromBody] Models.LoginRequest request) => Ok();
}
`,
      "Models/LoginRequest.cs": `namespace Demo.Api.Models;

public class LoginRequest
{
    public required string Username { get; set; }
    public string Password;
    public virtual int Attempts { get; set; }
}
`
    });
    const login = result.routes[0];

    expect(JSON.parse(login.requestBody!.variants[0].defaultBody!)).toEqual({
      username: "string",
      password: "string",
      attempts: 0
    });
  });

  it("reads a record that states its properties in its declaration", async () => {
    const result = await scanDotnetProject({
      "Controllers/LoginController.cs": `using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class LoginController : ControllerBase
{
    [HttpPost]
    public IActionResult Login(LoginRequest request) => Ok();
}
`,
      "Models/LoginRequest.cs": `namespace Demo.Api.Models;

public record LoginRequest(string Username, string Password, int Attempts);
`
    });

    expect(JSON.parse(result.routes[0].requestBody!.variants[0].defaultBody!)).toEqual({
      username: "string",
      password: "string",
      attempts: 0
    });
  });

  it("fills the body from the model the action binds, at the framework's default naming", async () => {
    const result = await scanDotnetProject({
      "Controllers/UsersController.cs": CONTROLLER,
      "Models/CreateUserRequest.cs": REQUEST_MODEL
    });
    const create = result.routes.find((route) => route.method === "POST")!;
    const [variant] = create.requestBody!.variants;

    expect(JSON.parse(variant.defaultBody!)).toEqual({
      name: "string",
      age: 0,
      active: true,
      tenantId: "00000000-0000-0000-0000-000000000000",
      createdAt: "1970-01-01T00:00:00Z",
      roles: ["string"],
      address: { city: "string" }
    });
  });

  it("names body fields the way the project serializes them, and defaults an enum to its zero member", async () => {
    const result = await scanDotnetProject({
      "Controllers/UsersController.cs": CONTROLLER,
      "Models/CreateUserRequest.cs": ENUM_MODEL,
      "Program.cs": programWith(
        `    options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());`
      )
    });
    const create = result.routes.find((route) => route.method === "POST")!;

    expect(JSON.parse(create.requestBody!.variants[0].defaultBody!)).toEqual({
      full_name: "string",
      status: "Unknown",
      priority: "Normal",
      retry_count: 0
    });
  });

  it("reads an enum that states its members on one line", async () => {
    const result = await scanDotnetProject({
      "Controllers/UsersController.cs": CONTROLLER,
      "Models/CreateUserRequest.cs": `namespace Demo.Api.Models;

public enum Tier { Free = 0, Paid = 1 }

public class CreateUserRequest
{
    public Tier Tier { get; set; }
}
`,
      "Program.cs": programWith(
        "    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());"
      )
    });
    const create = result.routes.find((route) => route.method === "POST")!;

    expect(JSON.parse(create.requestBody!.variants[0].defaultBody!)).toEqual({ tier: "Free" });
  });

  it("keeps an enum numeric when the project has no string converter", async () => {
    const result = await scanDotnetProject({
      "Controllers/UsersController.cs": CONTROLLER,
      "Models/CreateUserRequest.cs": ENUM_MODEL,
      "Program.cs": programWith(
        "    options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;"
      )
    });
    const create = result.routes.find((route) => route.method === "POST")!;

    expect(JSON.parse(create.requestBody!.variants[0].defaultBody!)).toMatchObject({
      status: 0,
      priority: 0
    });
  });

  it("keeps PascalCase when the project turns the naming policy off", async () => {
    const result = await scanDotnetProject({
      "Controllers/UsersController.cs": CONTROLLER,
      "Models/CreateUserRequest.cs": ENUM_MODEL,
      "Program.cs": programWith("    options.JsonSerializerOptions.PropertyNamingPolicy = null;")
    });
    const create = result.routes.find((route) => route.method === "POST")!;

    expect(Object.keys(JSON.parse(create.requestBody!.variants[0].defaultBody!))).toEqual([
      "full_name",
      "Status",
      "Priority",
      "RetryCount"
    ]);
  });

  it("reads an api key requirement, including the header the attribute names", async () => {
    const result = await scanDotnetProject({
      "Controllers/WebhooksController.cs": API_KEY_CONTROLLER
    });
    const receive = result.routes.find((route) => route.method === "POST")!;
    const health = result.routes.find((route) => route.path.endsWith("health"))!;

    expect(receive.security).toEqual([
      {
        kind: "apiKey",
        schemeName: "ApiKey",
        location: "header",
        parameterName: "X-Client-Key"
      }
    ]);
    expect(health.security).toEqual([]);
  });

  it("keeps a bearer token and an api key a route asks for together", async () => {
    const result = await scanDotnetProject({
      "Controllers/WebhooksController.cs": API_KEY_CONTROLLER
    });
    const list = result.routes.find((route) => route.path === "/api/Reports")!;

    expect(list.security.map((security) => security.kind)).toEqual(["bearer", "apiKey"]);
    expect(list.security[1].parameterName).toBe("X-API-Key");
  });

  it("asks the environment for one value per scheme a route declares", async () => {
    const result = await scanDotnetProject({
      "Controllers/WebhooksController.cs": API_KEY_CONTROLLER
    });

    expect(deriveEnvironmentVariables(result.routes).map((variable) => variable.name)).toEqual(
      expect.arrayContaining(["baseUrl", "xClientKey", "bearerToken", "xApiKey"])
    );
  });

  it("puts a key the project requires of everything on every route it found", async () => {
    const result = await scanDotnetProject({
      "Controllers/UsersController.cs": CONTROLLER,
      "Program.cs": GLOBAL_KEY_PROGRAM
    });

    for (const route of result.routes) {
      expect(route.security).toEqual([
        {
          kind: "apiKey",
          schemeName: "ApiKey",
          location: "header",
          parameterName: "X-Client-Key"
        }
      ]);
    }
  });

  it("asks the environment for that key, so a value can be filled in", async () => {
    const result = await scanDotnetProject({
      "Controllers/UsersController.cs": CONTROLLER,
      "Program.cs": GLOBAL_KEY_PROGRAM
    });

    expect(deriveEnvironmentVariables(result.routes).map((variable) => variable.name)).toEqual(
      expect.arrayContaining(["baseUrl", "xClientKey"])
    );
  });

  it("takes the header name from the filter when only the filter states it", async () => {
    const result = await scanDotnetProject({
      "Controllers/UsersController.cs": CONTROLLER,
      "Security/ApiKeyAuthFilter.cs": KEY_FILTER,
      "Program.cs": `var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers(options =>
{
    options.Filters.Add<ApiKeyAuthFilter>();
});

var app = builder.Build();
app.Run();
`
    });

    expect(result.routes[0].security[0].parameterName).toBe("X-Tenant-Key");
  });

  it("lets an anonymous route out of what the project requires of the rest", async () => {
    const result = await scanDotnetProject({
      "Controllers/WebhooksController.cs": API_KEY_CONTROLLER,
      "Controllers/PingController.cs": ANONYMOUS_CONTROLLER,
      "Program.cs": GLOBAL_KEY_PROGRAM
    });

    const ping = result.routes.find((route) => route.path === "/api/Ping")!;
    const health = result.routes.find((route) => route.path.endsWith("health"))!;
    const receive = result.routes.find((route) => route.method === "POST")!;

    expect(ping.security).toEqual([]);
    expect(health.security).toEqual([]);
    expect(receive.security.map((security) => security.parameterName)).toEqual(["X-Client-Key"]);
  });

  it("requires nothing when the project registers no such guard", async () => {
    const result = await scanDotnetProject({ "Controllers/UsersController.cs": CONTROLLER });

    expect(result.routes.every((route) => route.security.length === 0)).toBe(true);
  });

  it("takes the api key from the scheme that declares it, not the JWT one beside it", async () => {
    const result = await scanDotnetProject({
      "Controllers/WebhooksController.cs": API_KEY_CONTROLLER,
      "Controllers/PingController.cs": ANONYMOUS_CONTROLLER,
      "Program.cs": SWAGGER_TWO_SCHEMES
    });

    const list = result.routes.find((route) => route.path === "/api/Reports")!;
    const ping = result.routes.find((route) => route.path === "/api/Ping")!;
    const names = deriveEnvironmentVariables(result.routes).map((variable) => variable.name);

    expect(list.security).toEqual([
      {
        kind: "bearer",
        schemeName: "Authorize",
        location: "header",
        parameterName: "Authorization"
      },
      {
        kind: "apiKey",
        schemeName: "RequireApiKey",
        location: "header",
        parameterName: "X-API-Key"
      }
    ]);
    expect(ping.security).toEqual([]);
    expect(names).toEqual(expect.arrayContaining(["xApiKey", "bearerToken"]));
    expect(names).not.toContain("authorization");
  });

  it("requires only the scheme the project's requirement names", async () => {
    const result = await scanDotnetProject({
      "Controllers/UsersController.cs": CONTROLLER,
      "Program.cs": SWAGGER_TWO_SCHEMES
    });

    for (const route of result.routes) {
      expect(route.security.map((security) => security.parameterName)).toEqual(["X-API-KEY"]);
    }
  });

  it("reads a form body: the model it binds, the loose fields, and the file", async () => {
    const result = await scanDotnetProject({
      "Controllers/EndorsementController.cs": `using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;

[ApiController]
[Route("Endorsement/Inf/Travel")]
public class EndorsementController : ControllerBase
{
    [HttpPost("Create")]
    public async Task<IActionResult> Create([FromForm] TravelRequest request, [FromForm] string remark, IFormFile attachment)
    {
        return Ok();
    }
}
`,
      "Models/TravelRequest.cs": `namespace Demo.Api.Models;

public class TravelRequest
{
    public string PolicyNo { get; set; }
    public int Days { get; set; }
}
`
    });

    const create = result.routes.find((route) => route.path.endsWith("Create"))!;
    const [variant] = create.requestBody!.variants;

    expect(create.path).toBe("/Endorsement/Inf/Travel/Create");
    /** A file in the body is what makes it multipart rather than url-encoded. */
    expect(variant.mediaType).toBe("multipart/form-data");
    /** A form binds by property name, whatever the JSON policy renames. */
    expect(JSON.parse(variant.defaultBody!)).toEqual({
      PolicyNo: "string",
      Days: 0,
      remark: "string",
      attachment: ""
    });
  });

  it("flattens a form model into the field names its binder reads", async () => {
    const result = await scanDotnetProject({
      "Controllers/EndorsementController.cs": `using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;

[ApiController]
[Route("Endorsement/Inf/Travel")]
public class EndorsementController : ControllerBase
{
    [HttpPost("Create")]
    public IActionResult Create([FromForm] TravelRequest request, IFormFile passport) => Ok();
}
`,
      "Models/TravelRequest.cs": `namespace Demo.Api.Models;

public class TravelRequest
{
    public string PolicyNo { get; set; }
    public Insured Insured { get; set; }
    public List<Traveller> Travellers { get; set; }
}

public class Insured
{
    public string Name { get; set; }
    public DateTime BirthDate { get; set; }
}

public class Traveller
{
    public string Passport { get; set; }
    public int Age { get; set; }
}
`
    });

    const create = result.routes.find((route) => route.path.endsWith("Create"))!;
    const fields = JSON.parse(create.requestBody!.variants[0].defaultBody!);

    /** What the binder reads: dotted names for a nested model, indexes for a list. */
    expect(fields).toEqual({
      PolicyNo: "string",
      "Insured.Name": "string",
      "Insured.BirthDate": "1970-01-01T00:00:00Z",
      "Travellers[0].Passport": "string",
      "Travellers[0].Age": 0,
      passport: ""
    });
  });

  it("binds a list of files without letting it stand in for the model", async () => {
    const result = await scanDotnetProject({
      "Controllers/EndorsementController.cs": `using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;

[ApiController]
[Route("Endorsement")]
public class EndorsementController : ControllerBase
{
    [HttpPost("Inf/Travel/Create")]
    public async Task<IActionResult> HandleInfCreateTravelEndorsement
    ([FromForm] EndorsementBody Body,
    [FromForm] List<IFormFile> Files)
    {
        return Ok();
    }
}
`,
      "Dtos/EndorsementBody.cs": `namespace Demo.Api.Dtos;

public class EndorsementBody
{
    public required string PolicyNo { get; set; }
    public string? Email { get; set; }
    public QuoteBody? QuoteBody { get; set; }
}

public class QuoteBody
{
    public string InsuredName { get; set; }
    public decimal DiscountRate { get; set; }
}
`
    });

    const create = result.routes.find((route) => route.path.endsWith("Create"))!;
    const [variant] = create.requestBody!.variants;

    expect(variant.schemaType).toBe("EndorsementBody");
    expect(JSON.parse(variant.defaultBody!)).toEqual({
      PolicyNo: "string",
      Email: "string",
      "QuoteBody.InsuredName": "string",
      "QuoteBody.DiscountRate": 0,
      Files: ""
    });
  });

  it("url-encodes a form that carries no file", async () => {
    const result = await scanDotnetProject({
      "Controllers/SearchController.cs": `using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class SearchController : ControllerBase
{
    [HttpPost]
    public IActionResult Run([FromForm] string term, [FromForm] int page) => Ok();
}
`
    });

    const [variant] = result.routes[0].requestBody!.variants;

    expect(variant.mediaType).toBe("application/x-www-form-urlencoded");
    expect(JSON.parse(variant.defaultBody!)).toEqual({ term: "string", page: 0 });
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

const RETURN_TYPES = `using Microsoft.AspNetCore.Mvc;

namespace Demo.Api.Controllers;

public class SysUserDto
{
    public int Id { get; set; }
    public string UserName { get; set; }
    public bool IsActive { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class SysUserController : ControllerBase
{
    [HttpGet("{id}")]
    public async Task<ActionResult<SysUserDto>> GetById(int id) => Ok(null);

    [HttpGet]
    public async Task<IEnumerable<SysUserDto>> List() => null;

    [HttpDelete("{id}")]
    public async Task<IActionResult> Remove(int id) => NoContent();

    [HttpPost("count")]
    public Task<int> Count() => Task.FromResult(0);
}
`;

describe("what an action says it returns", () => {
  it("reads the model out of the return type when nothing is declared", async () => {
    const result = await scanDotnetProject({ "Controllers/SysUserController.cs": RETURN_TYPES });
    const byId = result.routes.find((route) => route.path === "/api/SysUser/{id}" && route.method === "GET")!;

    expect(byId.responses).toEqual([
      {
        status: "200",
        description: null,
        mediaTypes: ["application/json"],
        example: expect.stringContaining('"userName"')
      }
    ]);
  });

  it("returns a list as a list", async () => {
    const result = await scanDotnetProject({ "Controllers/SysUserController.cs": RETURN_TYPES });
    const list = result.routes.find((route) => route.path === "/api/SysUser" && route.method === "GET")!;

    expect(JSON.parse(list.responses[0].example!)).toEqual([
      expect.objectContaining({ userName: expect.anything() })
    ]);
  });

  it("says nothing for a return type that carries no shape", async () => {
    const result = await scanDotnetProject({ "Controllers/SysUserController.cs": RETURN_TYPES });
    const removed = result.routes.find((route) => route.method === "DELETE")!;
    const counted = result.routes.find((route) => route.path === "/api/SysUser/count")!;

    expect(removed.responses).toEqual([]);
    expect(counted.responses).toEqual([]);
  });

  it("fills in the body of a status the attributes declared without one", async () => {
    const result = await scanDotnetProject({
      "Controllers/DeclaredController.cs": `using Microsoft.AspNetCore.Mvc;

namespace Demo.Api.Controllers;

public class OrderDto
{
    public int Id { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class DeclaredController : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrderDto>> Get() => Ok(null);
}
`
    });
    const route = result.routes[0];

    expect(route.responses.map((response) => response.status)).toEqual(["200", "404"]);
    expect(route.responses[0].example).toContain('"id"');
    expect(route.responses[1].example).toBeNull();
  });
});
