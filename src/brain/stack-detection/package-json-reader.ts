import fs from "node:fs/promises";
import path from "node:path";

export interface PackageJsonContent {
  main?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface PackageJsonReadResult {
  packageJson: PackageJsonContent | null;
  warnings: string[];
}

export async function readPackageJson(projectRoot: string): Promise<PackageJsonReadResult> {
  const filePath = path.join(projectRoot, "package.json");

  try {
    const content = await fs.readFile(filePath, "utf8");
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
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        packageJson: null,
        warnings: ["No package.json found."],
      };
    }

    return {
      packageJson: null,
      warnings: ["Invalid package.json."],
    };
  }
}
