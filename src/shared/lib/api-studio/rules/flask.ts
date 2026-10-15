import type { FrameworkRules } from "./types";

export const flaskRules: FrameworkRules = {
	id: "flask",
	label: "Flask",

	detect: {
		dependencies: ["flask", "flask-restful", "flask-smorest"],
		stacks: [],
		files: null,
	},

	sources: {
		extensions: [".py"],
		priorityNames: /(^|\/)(app|main|api|routes?|views?|blueprints?)\.py$/i,
		skipDirectories: /(^|\/)(\.venv|venv|site-packages|migrations|__pycache__|tests?)\//i,
		marker: /@\s*\w+\.(route|get|post|put|patch|delete)\s*\(/,
		maxFiles: 2000,
	},

	path: {
		placeholders: [/<([^<>]+)>/g],
		constraintSeparator: ":",
		constraintFirst: true,
		optionalMarkers: [],
		catchAllPrefixes: [],
		absolutePrefixes: ["/"],
		tokens: {},
		containerNameSuffix: null,
		constraintTypes: {
			int: "integer",
			float: "number",
			uuid: "string (uuid)",
			path: "string",
			string: "string",
		},
	},

	types: {
		str: "string",
		int: "integer",
		float: "number",
		bool: "boolean",
		dict: "object",
		list: "array<string>",
		datetime: "string (date-time)",
		uuid: "string (uuid)",
	},

	serialization: {
		namingPolicies: [],
		defaultNaming: "snake",
		nameAnnotations: [],
		stringEnums: [],
	},

	globalSecurity: {
		definitions: [
			/\b(?<id>[\w-]+)\s*:\s*\{[^}]*['"]type['"]\s*:\s*['"]apiKey['"]/g,
			/['"](?<id>[\w-]+)['"]\s*:\s*\{[^}]*['"]type['"]\s*:\s*['"]apiKey['"]/g,
		],
		definitionLength: 300,
		fields: {
			parameterName: [/['"]name['"]\s*:\s*['"]([^'"]+)['"]/],
			location: [/['"]in['"]\s*:\s*['"](\w+)['"]/],
			type: [/['"]type['"]\s*:\s*['"](\w+)['"]/],
			scheme: [/['"]scheme['"]\s*:\s*['"](\w+)['"]/],
		},
		requirements: [/security\s*(?:=\s*)?[:[]\s*(?:\[\s*)?\{\s*['"](?<id>[\w-]+)['"]/g],
		guards: [
			/before_request\s*\(\s*\w*api_?key\w*/i,
			/@\s*\w+\.before_request[\s\S]{0,200}?api_?key/i,
		],
		guardNames: [
			/(?:API_KEY_HEADER|API_KEY_NAME|HEADER_NAME)\s*=\s*['"]([^'"]+)['"]/i,
			/headers\s*\.\s*get\s*\(\s*['"]([^'"]+)['"]/,
			/headers\s*\[\s*['"]([^'"]+)['"]\s*\]/,
		],
		guardParameterName: "X-API-Key",
		hints: ["api_key", "apiKey", "API_KEY", "securitySchemes", "before_request"],
	},

	annotations: {
		syntax: "decorator",
		container: { templateAnnotations: [], markers: [], baseTypes: [], nameSuffix: null },
		methods: {},
		auth: { schemes: [], anonymous: [] },
		binding: {
			annotations: {},
			fileTypes: [],
			nameFrom: "identifier",
			ignoredTypes: ["Request", "Response"],
			inferBodyFromModel: true,
		},
		responses: null,
		summary: null,
	},

	calls: {
		methods: {
			get: "GET",
			post: "POST",
			put: "PUT",
			patch: "PATCH",
			delete: "DELETE",
		},
		separator: ".",
		groupCalls: ["Blueprint"],
		groups: {
			calls: ["Blueprint"],
			keywords: [],
			pathArgument: /url_prefix\s*=\s*['"]([^'"]+)['"]/,
		},
		mounts: [
			{
				pattern: /register_blueprint\s*\(\s*(?:\w+\.)?(\w+)[^)]*url_prefix\s*=\s*['"]([^'"]+)['"]/,
				group: 1,
				path: 2,
				overrides: true,
			},
		],
		blockGroups: null,
		methodsArgument: { pattern: /methods\s*=\s*\[([^\]]*)\]/, fallback: ["GET"] },
		resources: [],
		handlerDeclaration: /def\s+\w+\s*\(([\s\S]*?)\)\s*(?:->[^:]+)?:/,
		auth: {
			calls: [],
			middleware: ["login_required", "jwt_required", "auth_required", "token_required"],
			anonymousCalls: [],
			kind: "bearer",
		},
		summaryCalls: [],
		chainLines: 4,
	},
};
