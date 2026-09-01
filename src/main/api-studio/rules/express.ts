import type { FrameworkRules } from "./types";

export const expressRules: FrameworkRules = {
	id: "express",
	label: "Express and Fastify",

	detect: {
		dependencies: ["express", "fastify", "koa-router", "@koa/router", "hono"],
		stacks: [],
		files: null,
	},

	sources: {
		extensions: [".ts", ".js", ".mjs", ".tsx"],
		priorityNames: /(routes?|router|app|server|index|controller)\.(ts|js|mjs)$/i,
		skipDirectories: /(^|\/)(dist|build|coverage|\.next)\//i,
		marker: /\.(get|post|put|patch|delete|head|options|route|use)\s*\(\s*["'`]/,
		maxFiles: 2000,
	},

	path: {
		placeholders: [/:([A-Za-z0-9_?]+)/g, /\{([^{}]+)\}/g],
		constraintSeparator: null,
		optionalMarkers: ["?"],
		catchAllPrefixes: ["*"],
		absolutePrefixes: ["/"],
		tokens: {},
		containerNameSuffix: null,
		constraintTypes: {},
	},

	types: {},

	serialization: null,

	globalSecurity: {
		definitions: [
			/\b(?<id>[\w-]+)\s*:\s*\{[^}]*type\s*:\s*['"`]apiKey['"`]/g,
			/\b(?<id>[\w-]+)\s*:\s*\{[^}]*type\s*:\s*['"`]http['"`]/g,
		],
		definitionLength: 300,
		fields: {
			parameterName: [/name\s*:\s*['"`]([^'"`]+)['"`]/],
			location: [/\bin\s*:\s*['"`](\w+)['"`]/],
			type: [/type\s*:\s*['"`](\w+)['"`]/],
			scheme: [/scheme\s*:\s*['"`](\w+)['"`]/],
		},
		requirements: [/security\s*:\s*\[\s*\{\s*['"`]?(?<id>[\w-]+)['"`]?\s*:/g],
		guards: [
			/app\.use\s*\(\s*[\w.]*(?:apiKey|apikey|ApiKey)\w*/,
			/\brouter\.use\s*\(\s*[\w.]*(?:apiKey|apikey|ApiKey)\w*/,
		],
		guardNames: [
			/headers\s*\[\s*['"`]([^'"`]+)['"`]\s*\]/,
			/header\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/,
			/get\s*\(\s*['"`](x-[\w-]+)['"`]\s*\)/i,
		],
		guardParameterName: "x-api-key",
		hints: ["apiKey", "ApiKey", "apikey", "securitySchemes", "x-api-key", "X-API-KEY"],
	},

	annotations: null,

	calls: {
		methods: {
			get: "GET",
			post: "POST",
			put: "PUT",
			patch: "PATCH",
			delete: "DELETE",
			head: "HEAD",
			options: "OPTIONS",
		},
		separator: ".",
		groupCalls: ["Router", "route"],
		groups: null,
		mounts: [],
		blockGroups: null,
		methodsArgument: null,
		resources: [],
		handlerDeclaration: null,
		auth: {
			calls: ["requireAuth", "authenticate", "isAuthenticated"],
			middleware: ["requireAuth", "authenticate", "isAuthenticated", "authGuard", "verifyToken"],
			anonymousCalls: [],
			kind: "bearer",
		},
		summaryCalls: [],
		chainLines: 4,
	},
};
