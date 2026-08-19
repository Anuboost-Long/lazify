import type { FrameworkRules } from "./types";

export const laravelRules: FrameworkRules = {
  id: "laravel",
  label: "Laravel",

  detect: {
    dependencies: ["laravel/framework", "laravel/lumen-framework"],
    stacks: [],
    files: /(^|\/)(artisan|routes\/api\.php)$/
  },

  sources: {
    extensions: [".php"],
    priorityNames: /(^|\/)routes\/[\w-]+\.php$/i,
    skipDirectories: /(^|\/)(vendor|storage|bootstrap\/cache|node_modules)\//i,
    marker: /Route::(get|post|put|patch|delete|options|any|apiResource|resource)\s*\(/,
    maxFiles: 2000
  },

  path: {
    placeholders: [/\{([^}]+)\}/g],
    constraintSeparator: null,
    optionalMarkers: ["?"],
    catchAllPrefixes: [],
    absolutePrefixes: ["/"],
    tokens: {},
    containerNameSuffix: null,
    constraintTypes: {}
  },

  types: {
    string: "string",
    int: "integer",
    integer: "integer",
    float: "number",
    double: "number",
    bool: "boolean",
    boolean: "boolean",
    array: "array<string>",
    carbon: "string (date-time)",
    uuid: "string (uuid)"
  },

  serialization: {
    namingPolicies: [],
    defaultNaming: "snake",
    nameAnnotations: [],
    stringEnums: [/BackedEnum|:\s*string/]
  },

  globalSecurity: {
    definitions: [
      /@OA\\SecurityScheme\s*\([^)]*securityScheme\s*=\s*"(?<id>[^"]+)"/g,
      /(?<id>[\w-]+)\s*:\s*\{[^}]*type\s*:\s*['"]apiKey['"]/g,
      /['"](?<id>[\w-]+)['"]\s*=>\s*\[[^\]]*['"]type['"]\s*=>\s*['"]apiKey['"]/g
    ],
    definitionLength: 400,
    fields: {
      parameterName: [/name\s*=\s*"([^"]+)"/i, /['"]name['"]\s*=>\s*['"]([^'"]+)['"]/i],
      location: [/\bin\s*=\s*"(\w+)"/i, /['"]in['"]\s*=>\s*['"](\w+)['"]/i],
      type: [/\btype\s*=\s*"(\w+)"/i, /['"]type['"]\s*=>\s*['"](\w+)['"]/i],
      scheme: [/scheme\s*=\s*"(\w+)"/i, /['"]scheme['"]\s*=>\s*['"](\w+)['"]/i]
    },
    requirements: [/security\s*=\s*\{\s*\{\s*"(?<id>[\w-]+)"/g],
    guards: [
      /(?:->|::)middleware\s*\(\s*\[?\s*['"][\w.:-]*api[_.-]?key[\w.:-]*['"]/i,
      /['"][\w.-]*api[_.-]?key[\w.-]*['"]\s*=>\s*\w*ApiKey\w*::class/i
    ],
    guardNames: [
      /\$request->header\s*\(\s*['"]([^'"]+)['"]/,
      /headers->get\s*\(\s*['"]([^'"]+)['"]/,
      /HEADER\s*=\s*['"]([^'"]+)['"]/
    ],
    guardParameterName: "X-API-KEY",
    hints: ["api-key", "api_key", "apiKey", "ApiKey", "SecurityScheme", "securityScheme"]
  },

  annotations: null,

  calls: {
    methods: {
      get: "GET",
      post: "POST",
      put: "PUT",
      patch: "PATCH",
      delete: "DELETE",
      options: "OPTIONS"
    },
    separator: "::",
    groupCalls: [],
    groups: null,
    mounts: [],
    blockGroups: {
      openers: [
        /::prefix\s*\(\s*['"]([^'"]+)['"]/,
        /->prefix\s*\(\s*['"]([^'"]+)['"]/,
        /['"]prefix['"]\s*=>\s*['"]([^'"]+)['"]/
      ],
      authOpeners: [
        /middleware\s*\(\s*\[?\s*['"](auth|auth:[\w.-]+|sanctum|jwt[\w.-]*|passport)['"]/i,
        /['"]middleware['"]\s*=>\s*\[?\s*['"](auth|auth:[\w.-]+|sanctum)['"]/i
      ],
      open: "{",
      close: "}"
    },
    methodsArgument: null,
    resources: [
      {
        call: "apiResource",
        parameter: "id",
        routes: [
          { method: "GET", nested: false },
          { method: "POST", nested: false },
          { method: "GET", nested: true },
          { method: "PUT", nested: true },
          { method: "DELETE", nested: true }
        ]
      }
    ],
    handlerDeclaration: null,
    auth: {
      calls: ["middleware"],
      middleware: [],
      anonymousCalls: ["withoutMiddleware"],
      kind: "bearer"
    },
    summaryCalls: [],
    chainLines: 3
  }
};
