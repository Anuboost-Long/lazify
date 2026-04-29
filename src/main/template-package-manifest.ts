import fs from "node:fs";
import path from "node:path";

import type { TemplateDefinition } from "./harmonizer";

export interface TemplatePackageManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface TemplatePackageEntry {
  name: string;
  version: string;
}

export interface ProjectPackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface PackageVersionMismatch {
  name: string;
  expected: string;
  actual: string;
  dependencyType: "dependencies" | "devDependencies";
}

export interface TemplatePackageInstallPlan {
  dependencies: string[];
  devDependencies: string[];
  versionMismatches: PackageVersionMismatch[];
}

const TEMPLATE_PACKAGE_DIRECTORY = path.resolve(process.cwd(), "templates/packages");

export function loadTemplatePackageManifest(template: TemplateDefinition): TemplatePackageManifest {
  if (!template.packageManifest) {
    return {};
  }

  const manifestPath = path.join(TEMPLATE_PACKAGE_DIRECTORY, template.packageManifest);

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Package manifest "${template.packageManifest}" was not found.`);
  }

  const raw = fs.readFileSync(manifestPath, "utf8");
  return JSON.parse(raw) as TemplatePackageManifest;
}

export function listTemplatePackageEntries(template: TemplateDefinition): TemplatePackageEntry[] {
  const manifest = loadTemplatePackageManifest(template);

  return mapPackageEntries(manifest.dependencies);
}

export function readProjectPackageJson(projectPath: string): ProjectPackageJson {
  const packageJsonPath = path.join(projectPath, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`Generated project is missing package.json at ${packageJsonPath}`);
  }

  const raw = fs.readFileSync(packageJsonPath, "utf8");
  return JSON.parse(raw) as ProjectPackageJson;
}

export function buildTemplatePackageInstallPlan(
  manifest: TemplatePackageManifest,
  projectPackageJson: ProjectPackageJson
): TemplatePackageInstallPlan {
  return {
    dependencies: collectMissingPackages(
      manifest.dependencies,
      projectPackageJson.dependencies
    ),
    devDependencies: collectMissingPackages(
      manifest.devDependencies,
      projectPackageJson.devDependencies
    ),
    versionMismatches: [
      ...collectVersionMismatches(
        manifest.dependencies,
        projectPackageJson.dependencies,
        "dependencies"
      ),
      ...collectVersionMismatches(
        manifest.devDependencies,
        projectPackageJson.devDependencies,
        "devDependencies"
      )
    ]
  };
}

function collectMissingPackages(
  expected: Record<string, string> | undefined,
  actual: Record<string, string> | undefined
) {
  if (!expected) {
    return [];
  }

  return Object.entries(expected)
    .filter(([name]) => !(actual && name in actual))
    .map(([name, version]) => `${name}@${version}`);
}

function collectVersionMismatches(
  expected: Record<string, string> | undefined,
  actual: Record<string, string> | undefined,
  dependencyType: "dependencies" | "devDependencies"
): PackageVersionMismatch[] {
  if (!expected || !actual) {
    return [];
  }

  return Object.entries(expected).flatMap(([name, expectedVersion]) => {
    const actualVersion = actual[name];

    if (!actualVersion || actualVersion === expectedVersion) {
      return [];
    }

    return [
      {
        name,
        expected: expectedVersion,
        actual: actualVersion,
        dependencyType
      }
    ];
  });
}

function mapPackageEntries(
  packages: Record<string, string> | undefined
): TemplatePackageEntry[] {
  if (!packages) {
    return [];
  }

  return Object.entries(packages).map(([name, version]) => ({
    name,
    version
  }));
}
