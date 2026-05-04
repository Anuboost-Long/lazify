import type { PackageManager } from "./types";

interface PackageManagerDetectionResult {
  packageManager: PackageManager;
  warnings: string[];
}

export function detectPackageManager(hasFile: (name: string) => boolean): PackageManagerDetectionResult {
  if (hasFile("pnpm-lock.yaml")) {
    return { packageManager: "pnpm", warnings: [] };
  }

  if (hasFile("yarn.lock")) {
    return { packageManager: "yarn", warnings: [] };
  }

  if (hasFile("bun.lockb") || hasFile("bun.lock")) {
    return { packageManager: "bun", warnings: [] };
  }

  if (hasFile("package-lock.json")) {
    return { packageManager: "npm", warnings: [] };
  }

  return {
    packageManager: "npm",
    warnings: ["No lock file found. Defaulted to npm."],
  };
}
