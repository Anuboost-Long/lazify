import { buildCommands } from "./command-builder";
import { createRootFileDetector } from "./file-detector";
import { readPackageJson } from "./package-json-reader";
import { detectPackageManager } from "./package-manager-detector";
import type { PackageJsonContent } from "./package-json-reader";
import type { ProjectStack, StackDetectionResult } from "./types";

function hasDependency(packageJson: PackageJsonContent | null, name: string) {
  return Boolean(packageJson?.dependencies?.[name] || packageJson?.devDependencies?.[name]);
}

function detectCandidates(projectRootDetector: Awaited<ReturnType<typeof createRootFileDetector>>, packageJson: PackageJsonContent | null) {
  const candidates: Array<{ stack: ProjectStack; confidence: number; reasons: string[] }> = [];

  const push = (stack: ProjectStack, confidence: number, reasons: string[]) => {
    if (reasons.length > 0) {
      candidates.push({ stack, confidence, reasons });
    }
  };

  const electronReasons: string[] = [];
  if (hasDependency(packageJson, "electron")) electronReasons.push("electron dependency found");
  if (hasDependency(packageJson, "electron-builder")) electronReasons.push("electron-builder dependency found");
  if (hasDependency(packageJson, "electron-forge")) electronReasons.push("electron-forge dependency found");
  if (projectRootDetector.hasFolder("electron")) electronReasons.push("electron folder exists");
  if (projectRootDetector.hasFile("electron-builder.json")) electronReasons.push("electron-builder.json exists");
  if (packageJson?.main?.includes("electron") || packageJson?.main?.includes("main")) {
    electronReasons.push("package.json main entry suggests electron");
  }
  push("electron", electronReasons.length > 0 ? 0.95 : 0, electronReasons);

  const expoReasons: string[] = [];
  if (hasDependency(packageJson, "expo")) expoReasons.push("expo dependency found");
  if (projectRootDetector.hasFile("app.json")) expoReasons.push("app.json exists");
  if (projectRootDetector.hasFile("app.config.js")) expoReasons.push("app.config.js exists");
  if (projectRootDetector.hasFile("app.config.ts")) expoReasons.push("app.config.ts exists");
  if (projectRootDetector.hasFile("expo-env.d.ts")) expoReasons.push("expo-env.d.ts exists");
  if (hasDependency(packageJson, "expo-router")) expoReasons.push("expo-router dependency found");
  if (hasDependency(packageJson, "react-native")) expoReasons.push("react-native dependency found");
  if (projectRootDetector.hasFile("metro.config.js")) expoReasons.push("metro.config.js exists");
  push("react-native-expo", hasDependency(packageJson, "expo") ? 0.95 : expoReasons.length > 0 ? 0.85 : 0, expoReasons);

  const rnCliReasons: string[] = [];
  if (hasDependency(packageJson, "react-native") && !hasDependency(packageJson, "expo")) {
    rnCliReasons.push("react-native dependency found without expo");
  }
  if (projectRootDetector.hasFolder("android")) rnCliReasons.push("android folder exists");
  if (projectRootDetector.hasFolder("ios")) rnCliReasons.push("ios folder exists");
  if (projectRootDetector.hasFile("metro.config.js")) rnCliReasons.push("metro.config.js exists");
  push(
    "react-native-cli",
    hasDependency(packageJson, "react-native") && projectRootDetector.hasFolder("android") && projectRootDetector.hasFolder("ios")
      ? 0.9
      : rnCliReasons.length > 0
        ? 0.75
        : 0,
    rnCliReasons
  );

  const nextReasons: string[] = [];
  if (hasDependency(packageJson, "next")) nextReasons.push("next dependency found");
  if (projectRootDetector.hasFile("next.config.js")) nextReasons.push("next.config.js exists");
  if (projectRootDetector.hasFile("next.config.ts")) nextReasons.push("next.config.ts exists");
  if (projectRootDetector.hasFile("next.config.mjs")) nextReasons.push("next.config.mjs exists");
  if (projectRootDetector.hasFolder("app")) nextReasons.push("app folder exists");
  if (projectRootDetector.hasFolder("pages")) nextReasons.push("pages folder exists");
  if (hasDependency(packageJson, "react")) nextReasons.push("react dependency found");
  if (hasDependency(packageJson, "react-dom")) nextReasons.push("react-dom dependency found");
  push("react-next", hasDependency(packageJson, "next") ? 0.95 : nextReasons.length > 0 ? 0.85 : 0, nextReasons);

  const viteReasons: string[] = [];
  if (hasDependency(packageJson, "vite")) viteReasons.push("vite dependency found");
  if (projectRootDetector.hasFile("vite.config.js")) viteReasons.push("vite.config.js exists");
  if (projectRootDetector.hasFile("vite.config.ts")) viteReasons.push("vite.config.ts exists");
  if (projectRootDetector.hasFile("vite.config.mjs")) viteReasons.push("vite.config.mjs exists");
  if (hasDependency(packageJson, "@vitejs/plugin-react")) viteReasons.push("@vitejs/plugin-react dependency found");
  if (hasDependency(packageJson, "react")) viteReasons.push("react dependency found");
  if (hasDependency(packageJson, "react-dom")) viteReasons.push("react-dom dependency found");
  if (projectRootDetector.hasFile("index.html")) viteReasons.push("index.html exists");
  push("react-vite", hasDependency(packageJson, "vite") ? 0.95 : viteReasons.length > 0 ? 0.85 : 0, viteReasons);

  const craReasons: string[] = [];
  if (hasDependency(packageJson, "react-scripts")) craReasons.push("react-scripts dependency found");
  push("react-cra", craReasons.length > 0 ? 0.95 : 0, craReasons);

  const nodeApiReasons: string[] = [];
  for (const dep of ["express", "fastify", "nestjs", "@nestjs/core", "koa"]) {
    if (hasDependency(packageJson, dep)) {
      nodeApiReasons.push(`${dep} dependency found`);
    }
  }
  push("node-api", nodeApiReasons.length > 0 ? 0.85 : 0, nodeApiReasons);

  const reactUnknownReasons: string[] = [];
  if (hasDependency(packageJson, "react") && hasDependency(packageJson, "react-dom") && !hasDependency(packageJson, "vite") && !hasDependency(packageJson, "next") && !hasDependency(packageJson, "react-scripts")) {
    reactUnknownReasons.push("react dependency found");
    reactUnknownReasons.push("react-dom dependency found");
  }
  push("react-unknown", reactUnknownReasons.length > 0 ? 0.65 : 0, reactUnknownReasons);

  return candidates;
}

function stackPriority(stack: ProjectStack) {
  switch (stack) {
    case "electron":
      return 1;
    case "react-native-expo":
      return 2;
    case "react-native-cli":
      return 3;
    case "react-next":
      return 4;
    case "react-vite":
      return 5;
    case "react-cra":
      return 6;
    case "node-api":
      return 7;
    case "react-unknown":
      return 8;
    default:
      return 9;
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

export async function detectProjectStack(projectRoot: string): Promise<StackDetectionResult> {
  const rootDetector = await createRootFileDetector(projectRoot);
  const packageJsonResult = await readPackageJson(projectRoot);
  const packageManagerResult = detectPackageManager(rootDetector.hasFile);
  const warnings = [...packageJsonResult.warnings, ...packageManagerResult.warnings];
  const candidates = detectCandidates(rootDetector, packageJsonResult.packageJson).sort(
    (left, right) => stackPriority(left.stack) - stackPriority(right.stack)
  );

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
    warnings.push("Multiple stack indicators detected.");
    warnings.push(
      `Multiple indicators found: ${candidates.map((candidate) => candidate.stack).join(" + ")}. Classified as ${selected.stack} because it has higher priority.`
    );
  }

  result.stack = selected.stack;
  result.confidence = selected.confidence;
  result.reasons = selected.reasons;

  switch (selected.stack) {
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
      result.metaFramework = hasDependency(packageJsonResult.packageJson, "express") ? "express" : "unknown";
      break;
    case "react-unknown":
      result.framework = "react";
      result.metaFramework = "unknown";
      warnings.push("React detected, but no known meta-framework was found.");
      break;
    default:
      break;
  }

  result.commands = buildCommands({
    stack: result.stack,
    packageManager: result.packageManager,
    packageJson: packageJsonResult.packageJson,
  });

  if (result.stack === "react-native-expo" && !result.commands.start) {
    warnings.push("Detected Expo but no expo start script found.");
  }

  if (result.stack === "electron" && !result.commands.dev && !result.commands.start) {
    warnings.push("Detected Electron but no desktop start/dev script found.");
  }

  if (result.stack === "node-api" && !result.commands.dev && !result.commands.start) {
    warnings.push("Node API detected but no dev/start script found.");
  }

  if ((result.stack === "react-next" || result.stack === "react-vite" || result.stack === "react-unknown") && !result.commands.dev && !result.commands.start) {
    warnings.push("Detected React but no dev/start script found.");
  }

  result.warnings = warnings;
  return result;
}
