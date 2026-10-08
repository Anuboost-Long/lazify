import type { PackageManager } from "./types";

interface PackageManagerDetectionResult {
  packageManager: PackageManager;
  warnings: string[];
}

const DECLARABLE_PACKAGE_MANAGERS = ["npm", "yarn", "pnpm", "bun"] as const;

export function detectPackageManager(
  hasFile: (name: string) => boolean,
  declared?: string,
): PackageManagerDetectionResult {
  const declaredName = declared?.split("@")[0];
  const declaredManager = DECLARABLE_PACKAGE_MANAGERS.find((name) => name === declaredName);

  if (declaredManager) {
    return { packageManager: declaredManager, warnings: [] };
  }

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
