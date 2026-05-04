import path from "node:path";

import { buildCommands } from "../stack-detection/command-builder";
import { createRootFileDetector } from "../stack-detection/file-detector";
import { detectProjectStack } from "../stack-detection/detect-stack";
import { detectPackageManager } from "../stack-detection/package-manager-detector";
import { readPackageJson } from "../stack-detection/package-json-reader";
import type { ProjectStack, StackDetectionResult } from "../stack-detection/types";
import { detectFeatures } from "./detect-features";
import { importProjectWithMetadata } from "./import-project";
import { normalizeStructure } from "./normalize-structure";
import type { ProjectTemplate, TreeNode } from "./types";
import { validateTemplate } from "./validate-template";

export async function createProjectTemplate(params: {
  projectRoot: string;
  selectedTree: TreeNode[];
  name: string;
  description?: string;
  confirmedStack?: ProjectStack;
}): Promise<ProjectTemplate> {
  const normalized = normalizeStructure(params.selectedTree);
  const features = detectFeatures(normalized.files, normalized.folders);
  const detectedStack = await detectProjectStack(params.projectRoot);
  const stackDetection = params.confirmedStack
    ? await confirmStackDetection(params.projectRoot, params.confirmedStack, detectedStack)
    : detectedStack;
  const createdAt = new Date().toISOString();
  const template: ProjectTemplate = {
    id: slug(params.name),
    name: params.name.trim(),
    description: params.description,
    sourceProjectPath: params.projectRoot,
    stackDetection,
    structure: {
      files: normalized.files,
      folders: normalized.folders,
      tree: params.selectedTree,
    },
    features,
    tags: buildTags(stackDetection.stack, stackDetection.framework, stackDetection.metaFramework, features),
    metadata: {
      createdAt,
      fileCount: normalized.files.length,
      folderCount: normalized.folders.length,
      selectedItemCount: normalized.files.length + normalized.folders.length,
    },
  };
  const validation = validateTemplate(template);

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  if (validation.warnings.length > 0) {
    template.stackDetection.warnings = [
      ...new Set([...template.stackDetection.warnings, ...validation.warnings]),
    ];
  }

  return template;
}

export async function createProjectTemplateFromSelection(params: {
  projectRoot: string;
  includedRelativePaths: string[];
  name: string;
  description?: string;
  id: string;
  confirmedStack?: ProjectStack;
}): Promise<ProjectTemplate> {
  const importResult = await importProjectWithMetadata(params.projectRoot, params.includedRelativePaths);
  const template = await createProjectTemplate({
    projectRoot: params.projectRoot,
    selectedTree: importResult.tree,
    name: params.name,
    description:
      params.description ??
      `Imported from ${path.basename(params.projectRoot)} with ${String(params.includedRelativePaths.length)} file${params.includedRelativePaths.length === 1 ? "" : "s"}.`,
    confirmedStack: params.confirmedStack,
  });

  template.id = params.id;
  template.metadata.originalFileCount = importResult.originalFileCount;
  template.stackDetection.warnings = [
    ...new Set([...template.stackDetection.warnings, ...importResult.warnings]),
  ];

  return template;
}

function slug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "laz-template";
}

function buildTags(stack: string, framework: string, metaFramework: string, features: string[]) {
  return [...new Set([stack, framework, metaFramework, ...features].filter(Boolean))];
}

async function confirmStackDetection(
  projectRoot: string,
  selectedStack: ProjectStack,
  detectedStack: StackDetectionResult
): Promise<StackDetectionResult> {
  const rootDetector = await createRootFileDetector(projectRoot);
  const packageJsonResult = await readPackageJson(projectRoot);
  const packageManagerResult = detectPackageManager(rootDetector.hasFile);
  const confirmed = createBaseStackDetection(selectedStack);

  confirmed.packageManager = packageManagerResult.packageManager;
  confirmed.commands = buildCommands({
    stack: selectedStack,
    packageManager: confirmed.packageManager,
    packageJson: packageJsonResult.packageJson,
  });
  confirmed.confidence = detectedStack.stack === selectedStack ? detectedStack.confidence : 1;
  confirmed.reasons =
    detectedStack.stack === selectedStack
      ? [...detectedStack.reasons, "Stack confirmed by user during import."]
      : [`Stack manually selected by user during import: ${selectedStack}.`];
  confirmed.warnings = [
    ...new Set([
      ...packageJsonResult.warnings,
      ...packageManagerResult.warnings,
      ...detectedStack.warnings,
      detectedStack.stack !== selectedStack
        ? `Auto-detected stack was ${detectedStack.stack}. Saved template uses user-selected stack ${selectedStack}.`
        : "",
    ].filter(Boolean)),
  ];

  return confirmed;
}

function createBaseStackDetection(stack: ProjectStack): StackDetectionResult {
  switch (stack) {
    case "react-native-expo":
      return createStackDetectionResult(stack, "react-native", "expo");
    case "react-native-cli":
      return createStackDetectionResult(stack, "react-native", "react-native-cli");
    case "react-next":
      return createStackDetectionResult(stack, "react", "nextjs");
    case "react-vite":
      return createStackDetectionResult(stack, "react", "vite");
    case "react-cra":
      return createStackDetectionResult(stack, "react", "cra");
    case "electron":
      return createStackDetectionResult(stack, "electron", "electron");
    case "node-api":
      return createStackDetectionResult(stack, "node", "express");
    case "react-unknown":
      return createStackDetectionResult(stack, "react", "unknown");
    default:
      return createStackDetectionResult("unknown", "unknown", "unknown");
  }
}

function createStackDetectionResult(
  stack: StackDetectionResult["stack"],
  framework: StackDetectionResult["framework"],
  metaFramework: StackDetectionResult["metaFramework"]
): StackDetectionResult {
  return {
    stack,
    framework,
    metaFramework,
    packageManager: "npm",
    commands: { install: "npm install" },
    confidence: 1,
    reasons: [],
    warnings: [],
  };
}
