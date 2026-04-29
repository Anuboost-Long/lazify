import fs from "node:fs";
import path from "node:path";

import type { CommandBinary, PackageManager } from "./scanner";

export interface TemplateDefinition {
  id: string;
  label: string;
  description: string;
  projectType: "expo" | "next" | "vite" | "react-native";
  preferredPackageManager: PackageManager;
  createCommands: Partial<Record<CommandBinary | PackageManager, string[]>>;
  postInstallDependencies?: string[];
  packageManifest?: string;
}

const TEMPLATE_DIRECTORY = path.resolve(process.cwd(), "templates");

export function listTemplates(): TemplateDefinition[] {
  if (!fs.existsSync(TEMPLATE_DIRECTORY)) {
    return [];
  }

  return fs
    .readdirSync(TEMPLATE_DIRECTORY)
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => {
      const raw = fs.readFileSync(path.join(TEMPLATE_DIRECTORY, entry), "utf8");
      return JSON.parse(raw) as TemplateDefinition;
    });
}

export function getTemplate(id: string): TemplateDefinition {
  const template = listTemplates().find((entry) => entry.id === id);

  if (!template) {
    throw new Error(`Template "${id}" was not found.`);
  }

  return template;
}

export function getInstallCommand(
  packageManager: PackageManager,
  packages: string[],
  options?: { dev?: boolean }
): string[] {
  if (packageManager === "yarn") {
    return options?.dev ? ["add", "--dev", ...packages] : ["add", ...packages];
  }

  return options?.dev ? ["install", "--save-dev", ...packages] : ["install", ...packages];
}

export function getAutoFixArgs(
  packageManager: PackageManager,
  packages: string[],
  options?: { dev?: boolean }
): string[] | null {
  if (packageManager === "npm") {
    return options?.dev
      ? ["install", "--save-dev", "--legacy-peer-deps", ...packages]
      : ["install", "--legacy-peer-deps", ...packages];
  }

  if (packageManager === "yarn") {
    return options?.dev
      ? ["add", "--dev", "--ignore-engines", ...packages]
      : ["add", "--ignore-engines", ...packages];
  }

  return null;
}

export function summarizeAutoFix(packageManager: PackageManager): string {
  if (packageManager === "npm") {
    return "Retrying with --legacy-peer-deps to bypass peer dependency conflicts.";
  }

  if (packageManager === "yarn") {
    return "Retrying with --ignore-engines to bypass engine mismatch checks.";
  }

  return "No automatic dependency fix is available for this package manager.";
}
