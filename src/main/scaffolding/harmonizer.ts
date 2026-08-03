import { readCatalog, type StarterSource } from "./catalog";
import type { CommandBinary, PackageManager } from "../environment/scanner";

/**
 * A yes/no choice a scaffolder exposes, surfaced in the UI before the run so
 * the CLI never has to prompt interactively. Templates without createOptions
 * keep their static createCommands untouched.
 */
export interface TemplateCreateOption {
  key: string;
  label: string;
  default: boolean;
  onFlag: string;
  offFlag: string;
}

/**
 * One catalog entry: the whole surface for adding a stack. createCommands is
 * what every entry can always fall back to; `starter` is optional, and its
 * absence is what makes a stack CLI-only rather than a gap. No entry ever
 * carries file content — conventions travel as recommendedPackages, because a
 * dependency list does not rot the way a file importing from the framework does.
 */
export interface TemplateDefinition {
  id: string;
  label: string;
  description: string;
  projectType: "expo" | "next" | "vite" | "react-native";
  preferredPackageManager: PackageManager;
  createCommands: Partial<Record<CommandBinary | PackageManager, string[]>>;
  createOptions?: TemplateCreateOption[];
  postInstallDependencies?: string[];
  packageManifest?: string;
  /** A name from the bundled icon set — never a URL, which would not render. */
  icon?: string;
  language?: string;
  recommendedPackages?: string[];
  starter?: StarterSource;
}

export function listTemplates(): TemplateDefinition[] {
  return readCatalog();
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

export function getUninstallCommand(packageManager: PackageManager, packageName: string): string[] {
  if (packageManager === "yarn") {
    return ["remove", packageName];
  }
  return ["uninstall", packageName];
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
