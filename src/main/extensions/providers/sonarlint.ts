import path from "node:path";

import { findJavaRuntime } from "../java-runtime";
import { MET, type ExtensionProvider } from "./types";

const MINIMUM_JAVA = 21;

const ANALYZERS = [
	"sonargo.jar",
	"sonarjava.jar",
	"sonarjavasymbolicexecution.jar",
	"sonarjs.jar",
	"sonarphp.jar",
	"sonarpython.jar",
	"sonarhtml.jar",
	"sonarxml.jar",
	"sonartext.jar",
	"sonariac.jar",
	"sonarlintomnisharp.jar",
];

const LANGUAGE_IDS: Record<string, string> = {
	".ts": "typescript",
	".tsx": "typescriptreact",
	".mts": "typescript",
	".cts": "typescript",
	".js": "javascript",
	".jsx": "javascriptreact",
	".mjs": "javascript",
	".cjs": "javascript",
	".java": "java",
	".py": "python",
	".php": "php",
	".go": "go",
	".cs": "csharp",
	".html": "html",
	".xml": "xml",
	".yaml": "yaml",
	".yml": "yaml",
	".tf": "terraform",
	".json": "json",
	".css": "css",
	".scss": "scss",
	".sh": "shellscript",
	".rb": "ruby",
	".dockerfile": "dockerfile",
};

const RSPEC_LANGUAGE: Record<string, string> = {
	typescript: "typescript",
	typescriptreact: "typescript",
	javascript: "javascript",
	javascriptreact: "javascript",
};

export const sonarlint: ExtensionProvider = {
	entry: {
		id: "SonarSource.sonarlint-vscode",
		namespace: "SonarSource",
		name: "sonarlint-vscode",
		displayName: "SonarQube for IDE",
		summary:
			"SonarSource's own analyzers for Java, Python, PHP, Go, C#, IaC and secrets, plus type-aware JS and TS rules.",
		homepage: "https://open-vsx.org/extension/SonarSource/sonarlint-vscode",
	},
	settingsSection: "sonarlint",
	diagnosticSource: "sonarlint",
	serverMarker: path.join("server", "sonarlint-ls.jar"),
	launch: (unpackedRoot) => {
		const java = findJavaRuntime(MINIMUM_JAVA);

		if (!java) return null;

		return {
			command: java.path,
			args: [
				"-Dsonarlint.telemetry.disabled=true",
				"-jar",
				path.join(unpackedRoot, "server", "sonarlint-ls.jar"),
				"-stdio",
				"-analyzers",
				...ANALYZERS.map((jar) => path.join(unpackedRoot, "analyzers", jar)),
			],
			env: {},
		};
	},
	requirement: () =>
		findJavaRuntime(MINIMUM_JAVA)
			? MET
			: {
					satisfied: false,
					label: "extensions.needs_java",
					note: `No Java ${MINIMUM_JAVA}+ runtime was found, so this engine is not analysing anything.`,
					helpUrl: "https://adoptium.net/temurin/releases/?version=21",
				},
	initializationOptions: (projectPath) => ({
		productKey: "lazify",
		productName: "Lazify",
		productVersion: "1.0.0",
		workspaceName: path.basename(projectPath),
		showVerboseLogs: false,
		platform: process.platform,
		architecture: process.arch,
		additionalAttributes: {},
		clientNodePath: process.execPath,
		firstSecretDetected: false,
		enableNotebooks: false,
	}),
	defaultSettings: () => ({
		disableTelemetry: true,
		rules: {},
		focusOnNewCode: false,
		pathToCompileCommands: "",
		ls: { vmargs: "" },
	}),
	languageIdFor: (filePath) => LANGUAGE_IDS[path.extname(filePath).toLowerCase()] ?? null,
	ruleUrl: (code) => {
		const [language, rule] = code.split(":");

		return rule
			? `https://rules.sonarsource.com/${RSPEC_LANGUAGE[language] ?? language}/RSPEC-${rule.replace(/^S/, "")}/`
			: null;
	},
};

export const SONARLINT_MINIMUM_JAVA = MINIMUM_JAVA;
