import type { FrameworkRules } from "./types";

export const expressRules: FrameworkRules = {
  id: "express",
  label: "Express and Fastify",

  detect: {
    dependencies: ["express", "fastify", "koa-router", "@koa/router", "hono"],
    stacks: [],
    files: null
  },

  sources: {
    extensions: [".ts", ".js", ".mjs", ".tsx"],
    priorityNames: /(routes?|router|app|server|index|controller)\.(ts|js|mjs)$/i,
    skipDirectories: /(^|\/)(dist|build|coverage|\.next)\//i,
    marker: /\.(get|post|put|patch|delete|head|options|route|use)\s*\(\s*["'`]/,
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

  types: {},

  annotations: null,

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
    groupCalls: ["Router", "route"],
    auth: {
      calls: ["requireAuth", "authenticate", "isAuthenticated"],
      middleware: ["requireAuth", "authenticate", "isAuthenticated", "authGuard", "verifyToken"],
      kind: "bearer"
    },
    summaryCalls: [],
    chainLines: 4
  }
};
