import type { StarterSource } from "@/shared/lib/scaffolding/catalog";
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
