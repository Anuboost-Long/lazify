import type { ProjectReader } from "./project-reader";

export interface PackageJsonContent {
  main?: string;
  packageManager?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface PackageJsonReadResult {
  packageJson: PackageJsonContent | null;
  warnings: string[];
}

export async function readPackageJson(project: ProjectReader): Promise<PackageJsonReadResult> {
  try {
    const content = await project.readText("package.json");

    if (content === null) {
      return {
        packageJson: null,
        warnings: ["No package.json found."],
      };
    }

    const parsed = JSON.parse(content) as unknown;

    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      return {
        packageJson: null,
        warnings: ["Invalid package.json."],
      };
    }

    return {
      packageJson: parsed as PackageJsonContent,
      warnings: [],
    };
  } catch {
    return {
      packageJson: null,
      warnings: ["Invalid package.json."],
    };
  }
}
