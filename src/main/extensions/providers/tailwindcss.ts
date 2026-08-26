import path from "node:path";

import { MET, type ExtensionProvider } from "./types";

const LANGUAGE_IDS: Record<string, string> = {
	".ts": "typescript",
	".tsx": "typescriptreact",
	".mts": "typescript",
	".cts": "typescript",
	".js": "javascript",
	".jsx": "javascriptreact",
	".mjs": "javascript",
	".cjs": "javascript",
	".html": "html",
	".vue": "vue",
	".svelte": "svelte",
	".astro": "astro",
	".php": "php",
	".css": "css",
	".scss": "scss",
	".md": "markdown",
	".mdx": "mdx",
};

const LINT_RULES = {
	cssConflict: "warning",
	invalidApply: "error",
	invalidScreen: "error",
	invalidVariant: "error",
	invalidConfigPath: "error",
	invalidTailwindDirective: "error",
	invalidSourceDirective: "error",
	recommendedVariantOrder: "warning",
	usedBlocklistedClass: "warning",
	suggestCanonicalClasses: "warning",
} as const;

export const tailwindcss: ExtensionProvider = {
	entry: {
		id: "bradlc.vscode-tailwindcss",
		namespace: "bradlc",
		name: "vscode-tailwindcss",
		displayName: "Tailwind CSS IntelliSense",
		summary: "Class name diagnostics that read your project's own Tailwind config.",
		homepage: "https://open-vsx.org/extension/bradlc/vscode-tailwindcss",
	},
	settingsSection: "tailwindCSS",
	diagnosticSource: "tailwindcss",
	serverMarker: path.join("dist", "tailwindServer.js"),
	launch: (unpackedRoot) => ({
		command: process.execPath,
		args: [path.join(unpackedRoot, "dist", "tailwindServer.js"), "--stdio"],
		env: { ELECTRON_RUN_AS_NODE: "1" },
	}),
	requirement: () => MET,
	initializationOptions: () => ({ userLanguages: {} }),
	languageIdFor: (filePath) => LANGUAGE_IDS[path.extname(filePath).toLowerCase()] ?? null,
	defaultSettings: () => ({
		validate: true,
		lint: { ...LINT_RULES },
		classAttributes: ["class", "className", "ngClass", "class:list"],
		classFunctions: ["clsx", "cva", "cn", "tw", "twMerge", "twJoin"],
		includeLanguages: {},
		experimental: {},
		files: { exclude: ["**/.git/**", "**/node_modules/**", "**/dist/**", "**/build/**"] },
	}),
	ruleUrl: () => "https://tailwindcss.com/docs/editor-setup",
};
