import type { FrameworkRules } from "./types";

export const aspNetRules: FrameworkRules = {
  id: "aspnet",
  label: "ASP.NET Core",

  detect: {
    dependencies: [],
    stacks: ["dotnet"],
    files: /\.(csproj|sln|fsproj)$/i
  },

  sources: {
    extensions: [".cs"],
    priorityNames: /(Controller|Endpoints?|Program|Startup)\.cs$/i,
    skipDirectories: /(^|\/)Migrations\//i,
    marker: /\[Http(Get|Post|Put|Patch|Delete|Head|Options)|\.Map[A-Z]/,
    maxFiles: 2000
  },

  path: {
    placeholders: [/\{([^}]+)\}/g],
    constraintSeparator: ":",
    optionalMarkers: ["?"],
    catchAllPrefixes: ["**", "*"],
    absolutePrefixes: ["/", "~/"],
    tokens: { container: "[controller]", action: "[action]" },
    containerNameSuffix: "Controller",
    constraintTypes: {
      int: "integer",
      long: "integer",
      min: "integer",
      max: "integer",
      range: "integer",
      bool: "boolean",
      double: "number",
      float: "number",
      decimal: "number",
      guid: "string (uuid)",
      datetime: "string (date-time)",
      alpha: "string",
      length: "string",
      minlength: "string",
      maxlength: "string",
      regex: "string"
    }
  },

  types: {
    string: "string",
    char: "string",
    guid: "string (uuid)",
    datetime: "string (date-time)",
    dateonly: "string (date)",
    timespan: "string",
    int: "integer",
    int32: "integer",
    int64: "integer",
    long: "integer",
    short: "integer",
    byte: "integer",
    bool: "boolean",
    boolean: "boolean",
    double: "number",
    float: "number",
    decimal: "number"
  },

  annotations: {
    syntax: "bracket",
    container: {
      templateAnnotations: ["Route", "RoutePrefix"],
      markers: ["ApiController"],
      baseTypes: ["ControllerBase", "Controller", "ApiController"],
      nameSuffix: "Controller"
    },
    methods: {
      HttpGet: "GET",
      HttpPost: "POST",
      HttpPut: "PUT",
      HttpPatch: "PATCH",
      HttpDelete: "DELETE",
      HttpHead: "HEAD",
      HttpOptions: "OPTIONS"
    },
    auth: {
      require: ["Authorize"],
      anonymous: ["AllowAnonymous"],
      kind: "bearer",
      parameterName: "Authorization",
      location: "header"
    },
    binding: {
      annotations: {
        FromQuery: "query",
        FromRoute: "path",
        FromHeader: "header",
        FromBody: "body",
        FromForm: "body",
        FromServices: "ignore"
      },
      nameFrom: "identifier",
      ignoredTypes: [
        "cancellationtoken",
        "httpcontext",
        "httprequest",
        "httpresponse",
        "claimsprincipal",
        "iformfile",
        "iformfilecollection"
      ],
      inferBodyFromModel: true
    },
    responses: { annotation: "ProducesResponseType", statusPattern: /Status(\d{3})|^(\d{3})$/ },
    summary: { linePrefix: "///", tag: "summary" }
  },

  calls: {
    methods: {
      MapGet: "GET",
      MapPost: "POST",
      MapPut: "PUT",
      MapPatch: "PATCH",
      MapDelete: "DELETE"
    },
    groupCalls: ["MapGroup"],
    auth: { calls: ["RequireAuthorization"], middleware: [], kind: "bearer" },
    summaryCalls: ["WithSummary", "WithName"],
    chainLines: 6
  }
};
