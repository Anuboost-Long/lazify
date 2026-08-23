import type { FrameworkRules } from "./types";

const TYPESCRIPT_TYPES: Record<string, string> = {
  string: "string",
  number: "number",
  boolean: "boolean",
  date: "string (date-time)",
  any: "string"
};

export const nestJsRules: FrameworkRules = {
  id: "nestjs",
  label: "NestJS",

  detect: {
    dependencies: ["@nestjs/core", "@nestjs/common"],
    stacks: [],
    files: null
  },

  sources: {
    extensions: [".ts"],
    priorityNames: /\.controller\.ts$/i,
    skipDirectories: /(^|\/)(dist|coverage)\//i,
    marker: /@(Get|Post|Put|Patch|Delete|Head|Options|Controller)\s*\(/,
    maxFiles: 2000
  },

  path: {
    placeholders: [/:([A-Za-z0-9_?]+)/g, /\{([^}]+)\}/g],
    constraintSeparator: null,
    optionalMarkers: ["?"],
    catchAllPrefixes: ["*"],
    absolutePrefixes: ["/"],
    tokens: {},
    containerNameSuffix: null,
    constraintTypes: {}
  },

  types: TYPESCRIPT_TYPES,

  serialization: null,

  globalSecurity: {
    definitions: [
      /addApiKey\s*\(\s*\{[^}]*\}\s*,\s*['"`](?<id>[\w-]+)['"`]/g,
      /addSecurity\s*\(\s*['"`](?<id>[\w-]+)['"`]\s*,\s*\{[^}]*\}/g,
      /(?<id>[\w-]+)\s*:\s*\{[^}]*type\s*:\s*['"`]apiKey['"`]/g
    ],
    definitionLength: 300,
    fields: {
      parameterName: [/name\s*:\s*['"`]([^'"`]+)['"`]/],
      location: [/\bin\s*:\s*['"`](\w+)['"`]/],
      type: [/type\s*:\s*['"`](\w+)['"`]/],
      scheme: [/scheme\s*:\s*['"`](\w+)['"`]/]
    },
    requirements: [
      /addGlobalSecurity\s*\(\s*['"`](?<id>[\w-]+)['"`]/g,
      /useGlobalGuards\s*\([^)]*\)[\s\S]{0,200}?ApiSecurity\s*\(\s*['"`](?<id>[\w-]+)['"`]/g
    ],
    guards: [
      /useGlobalGuards\s*\(\s*new\s+\w*ApiKey\w*/,
      /provide\s*:\s*APP_GUARD[\s\S]{0,120}?useClass\s*:\s*\w*ApiKey\w*/
    ],
    guardNames: [
      /headers\s*\[\s*['"`]([^'"`]+)['"`]\s*\]/,
      /header\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/
    ],
    guardParameterName: "x-api-key",
    hints: ["addApiKey", "ApiKey", "apiKey", "APP_GUARD", "securitySchemes"]
  },

  annotations: {
    syntax: "decorator",
    container: {
      templateAnnotations: ["Controller"],
      markers: ["Controller"],
      baseTypes: [],
      nameSuffix: "Controller"
    },
    methods: {
      Get: "GET",
      Post: "POST",
      Put: "PUT",
      Patch: "PATCH",
      Delete: "DELETE",
      Head: "HEAD",
      Options: "OPTIONS",
      All: "GET"
    },
    auth: {
      schemes: [
        {
          annotations: ["UseGuards", "ApiBearerAuth"],
          kind: "bearer",
          parameterName: "Authorization",
          location: "header"
        },
        {
          annotations: ["ApiKey", "ApiSecurity"],
          kind: "apiKey",
          parameterName: "X-API-Key",
          location: "header",
          nameFromArgument: true
        }
      ],
      anonymous: ["Public", "SkipAuth"]
    },
    binding: {
      annotations: {
        Query: "query",
        Param: "path",
        Headers: "header",
        Body: "body",
        Req: "ignore",
        Res: "ignore",
        Request: "ignore",
        Response: "ignore",
        Session: "ignore",
        Ip: "ignore"
      },
      fileTypes: ["express.multer.file", "multerfile"],
      nameFrom: "annotationArgument",
      ignoredTypes: ["request", "response", "executioncontext"],
      inferBodyFromModel: false
    },
    responses: { annotation: "HttpCode", statusPattern: /(\d{3})/ },
    responseFromReturnType: true,
    summary: { linePrefix: "*", tag: "summary" }
  },

  calls: null
};
