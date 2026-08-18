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
      require: ["UseGuards", "ApiBearerAuth"],
      anonymous: ["Public", "SkipAuth"],
      kind: "bearer",
      parameterName: "Authorization",
      location: "header"
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
      nameFrom: "annotationArgument",
      ignoredTypes: ["request", "response", "executioncontext"],
      inferBodyFromModel: false
    },
    responses: { annotation: "HttpCode", statusPattern: /(\d{3})/ },
    summary: { linePrefix: "*", tag: "summary" }
  },

  calls: null
};
