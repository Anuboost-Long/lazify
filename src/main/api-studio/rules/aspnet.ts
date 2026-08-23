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

  serialization: {
    namingPolicies: [
      { pattern: /SnakeCaseUpper/, naming: "snakeUpper" },
      { pattern: /SnakeCase/, naming: "snake" },
      { pattern: /KebabCase/, naming: "kebab" },
      { pattern: /CamelCase/, naming: "camel" },
      { pattern: /PropertyNamingPolicy\s*=\s*null|DefaultNamingStrategy/, naming: "pascal" },
      { pattern: /AddNewtonsoftJson/, naming: "pascal" }
    ],
    defaultNaming: "camel",
    nameAnnotations: ["JsonPropertyName", "JsonProperty"],
    stringEnums: [/JsonStringEnumConverter|StringEnumConverter/]
  },

  globalSecurity: {
    definitions: [/AddSecurityDefinition\s*\(\s*"(?<id>[^"]+)"/g],
    definitionLength: 600,
    fields: {
      parameterName: [/Name\s*=\s*"([^"]+)"/],
      location: [/In\s*=\s*ParameterLocation\.(\w+)/],
      type: [/Type\s*=\s*SecuritySchemeType\.(\w+)/],
      scheme: [/Scheme\s*=\s*"([^"]+)"/]
    },
    requirements: [/Id\s*=\s*"(?<id>[^"]+)"/g],
    guards: [
      /Filters\.Add\s*[<(]\s*(?:new\s+)?\w*ApiKey\w*/,
      /UseMiddleware\s*<\s*\w*ApiKey\w*\s*>/,
      /ServiceFilter\s*\(\s*typeof\s*\(\s*\w*ApiKey\w*/
    ],
    guardNames: [
      /HeaderName\s*(?:=|=>)\s*"([^"]+)"/,
      /Headers\s*\[\s*"([^"]+)"\s*\]/,
      /Headers\.TryGetValue\s*\(\s*"([^"]+)"/
    ],
    guardParameterName: "X-API-Key",
    hints: ["AddSecurityDefinition", "ApiKey", "APIKey", "SecurityRequirement"]
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
      schemes: [
        {
          annotations: ["Authorize"],
          kind: "bearer",
          parameterName: "Authorization",
          location: "header"
        },
        {
          annotations: ["ApiKey", "RequireApiKey", "ApiKeyAuth", "ApiKeyRequired"],
          kind: "apiKey",
          parameterName: "X-API-Key",
          location: "header",
          nameFromArgument: true
        }
      ],
      anonymous: ["AllowAnonymous"]
    },
    binding: {
      annotations: {
        FromQuery: "query",
        FromRoute: "path",
        FromHeader: "header",
        FromBody: "body",
        FromForm: "form",
        FromServices: "ignore"
      },
      nameFrom: "identifier",
      ignoredTypes: [
        "cancellationtoken",
        "httpcontext",
        "httprequest",
        "httpresponse",
        "claimsprincipal"
      ],
      fileTypes: ["iformfile", "iformfilecollection"],
      inferBodyFromModel: true
    },
    responses: { annotation: "ProducesResponseType", statusPattern: /Status(\d{3})|^(\d{3})$/ },
    responseFromReturnType: true,
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
    separator: ".",
    groupCalls: ["MapGroup"],
    groups: null,
    mounts: [],
    blockGroups: null,
    methodsArgument: null,
    resources: [],
    handlerDeclaration: null,
    auth: {
      calls: ["RequireAuthorization"],
      middleware: [],
      anonymousCalls: ["AllowAnonymous"],
      kind: "bearer"
    },
    summaryCalls: ["WithSummary", "WithName"],
    chainLines: 6
  }
};
