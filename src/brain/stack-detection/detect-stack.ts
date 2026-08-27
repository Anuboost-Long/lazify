import { buildCommands, buildDotnetCommands, buildSwiftCommands } from "./command-builder";
import { detectDotnetProject, type DotnetDetectionResult } from "./dotnet-detector";
import { createRootFileDetector } from "./file-detector";
import { readPackageJson } from "./package-json-reader";
import type { PackageJsonContent } from "./package-json-reader";
import { detectPackageManager } from "./package-manager-detector";
import { detectSwiftProject, type SwiftDetectionResult } from "./swift-detector";
import type { ProjectStack, StackDetectionResult } from "./types";

function hasDependency(packageJson: PackageJsonContent | null, name: string) {
	return Boolean(packageJson?.dependencies?.[name] || packageJson?.devDependencies?.[name]);
}

/**
 * A .NET project only outranks a JS one when its marker sits at the repo root.
 * That keeps a Next.js app that happens to vendor a sample `.csproj` deeper in
 * the tree classified as Next.js.
 */
function claimsRoot(dotnet: DotnetDetectionResult, packageJson: PackageJsonContent | null) {
	if (dotnet.projectFiles.length === 0 && !dotnet.solutionFile) return false;
	if (!packageJson) return true;

	const atRoot = (file: string | null) => Boolean(file) && !file!.includes("/");

	return atRoot(dotnet.solutionFile) || dotnet.projectFiles.some((file) => atRoot(file));
}

/** Keeps the reasons whose check matched, in the order they are written. */
function reasonsFrom(checks: Array<[boolean, string]>): string[] {
	return checks.filter(([matched]) => matched).map(([, reason]) => reason);
}

/**
 * The defining dependency scores `strong`, supporting markers alone score
 * `weak`, and nothing at all scores 0 — which keeps the candidate out.
 */
function confidenceOf(defining: boolean, reasons: string[], strong: number, weak: number) {
	if (defining) return strong;

	return reasons.length > 0 ? weak : 0;
}

/** A UI framework is the strongest claim, then a manifest, then sources alone. */
function swiftConfidence(swift: SwiftDetectionResult) {
	if (swift.ui !== null) return 0.95;

	return swift.packageFile ? 0.9 : 0.8;
}

function detectCandidates(
	projectRootDetector: Awaited<ReturnType<typeof createRootFileDetector>>,
	packageJson: PackageJsonContent | null,
	dotnet: DotnetDetectionResult,
	swift: SwiftDetectionResult,
) {
	const candidates: Array<{ stack: ProjectStack; confidence: number; reasons: string[] }> = [];

	const push = (stack: ProjectStack, confidence: number, reasons: string[]) => {
		if (reasons.length > 0) {
			candidates.push({ stack, confidence, reasons });
		}
	};

	if (claimsRoot(dotnet, packageJson)) {
		push("dotnet", dotnet.solutionFile ? 0.95 : 0.9, dotnet.reasons);
	}

	// The detector only reports markers it found at the root, so reaching here at
	// all means Swift owns the top of the repository — a React Native app's
	// `ios/` project never gets this far.
	push(swift.ui === "swiftui" ? "swift-ui" : "swift", swiftConfidence(swift), swift.reasons);

	const electronReasons = reasonsFrom([
		[hasDependency(packageJson, "electron"), "electron dependency found"],
		[hasDependency(packageJson, "electron-builder"), "electron-builder dependency found"],
		[hasDependency(packageJson, "electron-forge"), "electron-forge dependency found"],
		[projectRootDetector.hasFolder("electron"), "electron folder exists"],
		[projectRootDetector.hasFile("electron-builder.json"), "electron-builder.json exists"],
		[
			Boolean(packageJson?.main?.includes("electron") || packageJson?.main?.includes("main")),
			"package.json main entry suggests electron",
		],
	]);
	push("electron", electronReasons.length > 0 ? 0.95 : 0, electronReasons);

	const expoReasons = reasonsFrom([
		[hasDependency(packageJson, "expo"), "expo dependency found"],
		[projectRootDetector.hasFile("app.json"), "app.json exists"],
		[projectRootDetector.hasFile("app.config.js"), "app.config.js exists"],
		[projectRootDetector.hasFile("app.config.ts"), "app.config.ts exists"],
		[projectRootDetector.hasFile("expo-env.d.ts"), "expo-env.d.ts exists"],
		[hasDependency(packageJson, "expo-router"), "expo-router dependency found"],
		[hasDependency(packageJson, "react-native"), "react-native dependency found"],
		[projectRootDetector.hasFile("metro.config.js"), "metro.config.js exists"],
	]);
	push(
		"react-native-expo",
		confidenceOf(hasDependency(packageJson, "expo"), expoReasons, 0.95, 0.85),
		expoReasons,
	);

	const rnCliReasons = reasonsFrom([
		[
			hasDependency(packageJson, "react-native") && !hasDependency(packageJson, "expo"),
			"react-native dependency found without expo",
		],
		[projectRootDetector.hasFolder("android"), "android folder exists"],
		[projectRootDetector.hasFolder("ios"), "ios folder exists"],
		[projectRootDetector.hasFile("metro.config.js"), "metro.config.js exists"],
	]);
	push(
		"react-native-cli",
		confidenceOf(
			hasDependency(packageJson, "react-native") &&
				projectRootDetector.hasFolder("android") &&
				projectRootDetector.hasFolder("ios"),
			rnCliReasons,
			0.9,
			0.75,
		),
		rnCliReasons,
	);

	const nextReasons = reasonsFrom([
		[hasDependency(packageJson, "next"), "next dependency found"],
		[projectRootDetector.hasFile("next.config.js"), "next.config.js exists"],
		[projectRootDetector.hasFile("next.config.ts"), "next.config.ts exists"],
		[projectRootDetector.hasFile("next.config.mjs"), "next.config.mjs exists"],
		[projectRootDetector.hasFolder("app"), "app folder exists"],
		[projectRootDetector.hasFolder("pages"), "pages folder exists"],
		[hasDependency(packageJson, "react"), "react dependency found"],
		[hasDependency(packageJson, "react-dom"), "react-dom dependency found"],
	]);
	push(
		"react-next",
		confidenceOf(hasDependency(packageJson, "next"), nextReasons, 0.95, 0.85),
		nextReasons,
	);

	const viteReasons = reasonsFrom([
		[hasDependency(packageJson, "vite"), "vite dependency found"],
		[projectRootDetector.hasFile("vite.config.js"), "vite.config.js exists"],
		[projectRootDetector.hasFile("vite.config.ts"), "vite.config.ts exists"],
		[projectRootDetector.hasFile("vite.config.mjs"), "vite.config.mjs exists"],
		[hasDependency(packageJson, "@vitejs/plugin-react"), "@vitejs/plugin-react dependency found"],
		[hasDependency(packageJson, "react"), "react dependency found"],
		[hasDependency(packageJson, "react-dom"), "react-dom dependency found"],
		[projectRootDetector.hasFile("index.html"), "index.html exists"],
	]);
	push(
		"react-vite",
		confidenceOf(hasDependency(packageJson, "vite"), viteReasons, 0.95, 0.85),
		viteReasons,
	);

	const craReasons = reasonsFrom([
		[hasDependency(packageJson, "react-scripts"), "react-scripts dependency found"],
	]);
	push("react-cra", craReasons.length > 0 ? 0.95 : 0, craReasons);

	const nodeApiReasons = reasonsFrom(
		["express", "fastify", "nestjs", "@nestjs/core", "koa"].map((dep): [boolean, string] => [
			hasDependency(packageJson, dep),
			`${dep} dependency found`,
		]),
	);
	push("node-api", nodeApiReasons.length > 0 ? 0.85 : 0, nodeApiReasons);

	const isBareReact =
		hasDependency(packageJson, "react") &&
		hasDependency(packageJson, "react-dom") &&
		!hasDependency(packageJson, "vite") &&
		!hasDependency(packageJson, "next") &&
		!hasDependency(packageJson, "react-scripts");
	const reactUnknownReasons = reasonsFrom([
		[isBareReact, "react dependency found"],
		[isBareReact, "react-dom dependency found"],
	]);
	push("react-unknown", reactUnknownReasons.length > 0 ? 0.65 : 0, reactUnknownReasons);

	return candidates;
}

function stackPriority(stack: ProjectStack) {
	switch (stack) {
		case "dotnet":
			return 0;
		// Swift ranks with .NET rather than below the JS stacks: both only ever
		// reach here on a root marker, which is a stronger claim than a dependency.
		case "swift-ui":
			return 1;
		case "swift":
			return 2;
		case "electron":
			return 3;
		case "react-native-expo":
			return 4;
		case "react-native-cli":
			return 5;
		case "react-next":
			return 6;
		case "react-vite":
			return 7;
		case "react-cra":
			return 8;
		case "node-api":
			return 9;
		case "react-unknown":
			return 10;
		default:
			return 11;
	}
}

function baseResult(): StackDetectionResult {
	return {
		stack: "unknown",
		framework: "unknown",
		metaFramework: "unknown",
		packageManager: "npm",
		commands: { install: "npm install" },
		confidence: 0.1,
		reasons: [],
		warnings: [],
	};
}

/** Fills in the framework labels a stack implies, and returns any warning that comes with them. */
function applyFrameworkIdentity(
	result: StackDetectionResult,
	packageJson: PackageJsonContent | null,
	dotnet: DotnetDetectionResult,
	swift: SwiftDetectionResult,
): string[] {
	switch (result.stack) {
		case "react-native-expo":
			result.framework = "react-native";
			result.metaFramework = "expo";
			break;
		case "react-native-cli":
			result.framework = "react-native";
			result.metaFramework = "react-native-cli";
			break;
		case "react-next":
			result.framework = "react";
			result.metaFramework = "nextjs";
			break;
		case "react-vite":
			result.framework = "react";
			result.metaFramework = "vite";
			break;
		case "react-cra":
			result.framework = "react";
			result.metaFramework = "cra";
			break;
		case "electron":
			result.framework = "electron";
			result.metaFramework = "electron";
			break;
		case "node-api":
			result.framework = "node";
			result.metaFramework = hasDependency(packageJson, "express") ? "express" : "unknown";
			break;
		case "react-unknown":
			result.framework = "react";
			result.metaFramework = "unknown";
			return ["React detected, but no known meta-framework was found."];
		case "dotnet":
			result.framework = "dotnet";
			result.metaFramework = dotnet.flavor;
			result.packageManager = "dotnet";
			break;
		case "swift-ui":
		case "swift":
			result.framework = "swift";
			// A package is described by its manifest; an app by the UI it is built
			// against. Where neither is clear the stack still stands on its own.
			result.metaFramework = swift.ui ?? (swift.packageFile ? "swiftpm" : "unknown");
			result.packageManager = swift.podfile ? "cocoapods" : "swiftpm";
			break;
		default:
			break;
	}

	return [];
}

function isSwiftStack(stack: StackDetectionResult["stack"]) {
	return stack === "swift-ui" || stack === "swift";
}

function commandsFor(
	result: StackDetectionResult,
	packageJson: PackageJsonContent | null,
	dotnet: DotnetDetectionResult,
	swift: SwiftDetectionResult,
): StackDetectionResult["commands"] {
	if (isSwiftStack(result.stack)) return buildSwiftCommands(swift);
	if (result.stack === "dotnet") return buildDotnetCommands(dotnet);

	return buildCommands({
		stack: result.stack,
		packageManager: result.packageManager,
		packageJson,
	});
}

function swiftWarnings(result: StackDetectionResult, swift: SwiftDetectionResult): string[] {
	if (!isSwiftStack(result.stack)) return [];

	const warnings: string[] = [];

	// The scheme is guessed from the project's own name, which is right for the
	// conventional layout and wrong for a renamed or multi-scheme project — worth
	// saying, because a wrong scheme fails the build rather than mis-labelling it.
	if (swift.xcodeWorkspace || swift.xcodeProject) {
		warnings.push(`Assuming the "${swift.scheme}" scheme; adjust if the project defines others.`);
	}

	if (swift.ui === null) {
		warnings.push("Swift detected, but neither SwiftUI nor UIKit was found in the sources.");
	}

	return warnings;
}

/** What the classification promised but the project has no command for. */
function missingCommandWarnings(
	result: StackDetectionResult,
	dotnet: DotnetDetectionResult,
): string[] {
	const warnings: string[] = [];
	const hasEntryCommand = Boolean(result.commands.dev || result.commands.start);

	if (result.stack === "dotnet" && !dotnet.entryProjectFile) {
		warnings.push("Found a solution file but no project file to run.");
	}

	if (result.stack === "react-native-expo" && !result.commands.start) {
		warnings.push("Detected Expo but no expo start script found.");
	}

	if (result.stack === "electron" && !hasEntryCommand) {
		warnings.push("Detected Electron but no desktop start/dev script found.");
	}

	if (result.stack === "node-api" && !hasEntryCommand) {
		warnings.push("Node API detected but no dev/start script found.");
	}

	const isReactApp =
		result.stack === "react-next" ||
		result.stack === "react-vite" ||
		result.stack === "react-unknown";

	if (isReactApp && !hasEntryCommand) {
		warnings.push("Detected React but no dev/start script found.");
	}

	return warnings;
}

export async function detectProjectStack(projectRoot: string): Promise<StackDetectionResult> {
	const rootDetector = await createRootFileDetector(projectRoot);
	const packageJsonResult = await readPackageJson(projectRoot);
	const dotnet = await detectDotnetProject(projectRoot);
	const swift = await detectSwiftProject(projectRoot);
	const packageManagerResult = detectPackageManager(rootDetector.hasFile);
	const isDotnetOnly =
		claimsRoot(dotnet, packageJsonResult.packageJson) && !packageJsonResult.packageJson;

	// A .NET-only repo has no lock file to find, so that warning is just noise.
	const warnings = [
		...(isDotnetOnly ? [] : packageJsonResult.warnings),
		...(isDotnetOnly ? [] : packageManagerResult.warnings),
	];
	const candidates = detectCandidates(
		rootDetector,
		packageJsonResult.packageJson,
		dotnet,
		swift,
	).sort((left, right) => stackPriority(left.stack) - stackPriority(right.stack));

	const selected = candidates[0];
	const result = baseResult();
	result.packageManager = packageManagerResult.packageManager;

	if (!selected) {
		result.commands = buildCommands({
			stack: "unknown",
			packageManager: result.packageManager,
			packageJson: packageJsonResult.packageJson,
		});
		result.warnings = [
			...warnings,
			"Could not determine stack confidently.",
			"No recognized framework dependency or config file found.",
		];
		return result;
	}

	if (candidates.length > 1) {
		warnings.push(
			"Multiple stack indicators detected.",
			`Multiple indicators found: ${candidates.map((candidate) => candidate.stack).join(" + ")}. Classified as ${selected.stack} because it has higher priority.`,
		);
	}

	result.stack = selected.stack;
	result.confidence = selected.confidence;
	result.reasons = selected.reasons;

	warnings.push(...applyFrameworkIdentity(result, packageJsonResult.packageJson, dotnet, swift));

	result.commands = commandsFor(result, packageJsonResult.packageJson, dotnet, swift);

	warnings.push(...swiftWarnings(result, swift), ...missingCommandWarnings(result, dotnet));

	result.warnings = warnings;
	return result;
}
