import type { FrameworkRules } from "./types";

const PYTHON_TYPES = {
  str: "string",
  string: "string",
  int: "integer",
  float: "number",
  decimal: "number",
  bool: "boolean",
  bytes: "string",
  uuid: "string (uuid)",
  date: "string (date)",
  datetime: "string (date-time)",
  time: "string",
  dict: "object",
  list: "array<string>",
  emailstr: "string (email)",
  httpurl: "string (uri)"
};

export const fastApiRules: FrameworkRules = {
  id: "fastapi",
  label: "FastAPI",

  detect: {
    dependencies: ["fastapi"],
    stacks: [],
    files: null
  },

  sources: {
    extensions: [".py"],
    priorityNames: /(^|\/)(main|app|api|routes?|routers?|endpoints?|urls)\.py$/i,
    skipDirectories: /(^|\/)(\.venv|venv|site-packages|migrations|__pycache__|tests?)\//i,
    marker: /@\s*\w+\.(get|post|put|patch|delete|head|options)\s*\(/,
    maxFiles: 2000
  },

  path: {
    placeholders: [/\{([^}]+)\}/g],
    constraintSeparator: ":",
    optionalMarkers: [],
    catchAllPrefixes: [],
    absolutePrefixes: ["/"],
    tokens: {},
    containerNameSuffix: null,
    constraintTypes: { path: "string", int: "integer", float: "number", uuid: "string (uuid)" }
  },

  types: PYTHON_TYPES,

  serialization: {
    namingPolicies: [
      { pattern: /alias_generator\s*=\s*to_camel|populate_by_name/, naming: "camel" }
    ],
    defaultNaming: "snake",
    nameAnnotations: [],
    stringEnums: [/class\s+\w+\s*\(\s*str\s*,\s*Enum\s*\)/]
  },

  globalSecurity: {
    definitions: [
      /APIKeyHeader\s*\(\s*name\s*=\s*['"](?<id>[^'"]+)['"]/g,
      /APIKeyQuery\s*\(\s*name\s*=\s*['"](?<id>[^'"]+)['"]/g,
      /APIKeyCookie\s*\(\s*name\s*=\s*['"](?<id>[^'"]+)['"]/g
    ],
    definitionLength: 200,
    fields: {
      parameterName: [/name\s*=\s*['"]([^'"]+)['"]/],
      location: [/APIKey(Header|Query|Cookie)/],
      type: [/(APIKey)(?:Header|Query|Cookie)/],
      scheme: [/scheme_name\s*=\s*['"](\w+)['"]/]
    },
    requirements: [
      /dependencies\s*=\s*\[[^\]]*(?:Security|Depends)\s*\(\s*(?<id>\w+)/g,
      /app\.include_router\s*\([^)]*dependencies\s*=\s*\[[^\]]*(?:Security|Depends)\s*\(\s*(?<id>\w+)/g
    ],
    guards: [/dependencies\s*=\s*\[[^\]]*(?:Security|Depends)\s*\(\s*\w*api_?key\w*/i],
    guardNames: [
      /APIKeyHeader\s*\(\s*name\s*=\s*['"]([^'"]+)['"]/,
      /headers\s*\.\s*get\s*\(\s*['"]([^'"]+)['"]/,
      /headers\s*\[\s*['"]([^'"]+)['"]\s*\]/
    ],
    guardParameterName: "X-API-Key",
    hints: ["APIKey", "api_key", "apikey", "Security(", "dependencies="]
  },

  annotations: {
    syntax: "decorator",
    container: { templateAnnotations: [], markers: [], baseTypes: [], nameSuffix: null },
    methods: {},
    auth: { schemes: [], anonymous: [] },
    binding: {
      annotations: { Query: "query", Path: "path", Cookie: "cookie", Header: "header", Body: "body" },
      fileTypes: ["uploadfile"],
      nameFrom: "identifier",
      ignoredTypes: [
        "Request",
        "Response",
        "BackgroundTasks",
        "Session",
        "AsyncSession",
        "Depends",
        "Security",
        "UploadFile"
      ],
      inferBodyFromModel: true
    },
    responses: null,
    summary: null
  },

  calls: {
    methods: {
      get: "GET",
      post: "POST",
      put: "PUT",
      patch: "PATCH",
      delete: "DELETE",
      head: "HEAD",
      options: "OPTIONS"
    },
    separator: ".",
    groupCalls: ["APIRouter"],
    groups: {
      calls: ["APIRouter"],
      keywords: [],
      pathArgument: /prefix\s*=\s*['"]([^'"]+)['"]/
    },
    mounts: [
      {
        pattern: /include_router\s*\(\s*(?:\w+\.)?(\w+)[^)]*prefix\s*=\s*['"]([^'"]+)['"]/,
        group: 1,
        path: 2
      }
    ],
    blockGroups: null,
    methodsArgument: null,
    resources: [],
    handlerDeclaration: /def\s+\w+\s*\(([\s\S]*?)\)\s*(?:->[^:]+)?:/,
    auth: {
      calls: [],
      middleware: ["get_current_user", "oauth2_scheme", "get_current_active_user", "require_auth"],
      anonymousCalls: [],
      kind: "bearer"
    },
    summaryCalls: ["summary"],
    chainLines: 4
  }
};
