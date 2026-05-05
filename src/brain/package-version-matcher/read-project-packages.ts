import fs from "node:fs/promises";
import path from "node:path";

import type { AnchorInfo, InstalledPackages } from "./types";
import { stripRangePrefix } from "./semver-utils";

interface RawPackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export async function readInstalledPackages(projectPath: string): Promise<InstalledPackages> {
  const filePath = path.join(projectPath, "package.json");
  const raw = await fs.readFile(filePath, "utf8");
  const pkg = JSON.parse(raw) as RawPackageJson;

  const all: Record<string, string> = {
    ...pkg.dependencies,
    ...pkg.devDependencies
  };

  const devNames = new Set(Object.keys(pkg.devDependencies ?? {}));

  return { all, devNames };
}

/**
 * Determines the compatibility anchor from installed packages.
 * Priority: expo → react-native → next → react
 */
export function detectAnchor(packages: Record<string, string>): AnchorInfo | null {
  if (packages["expo"]) {
    return {
      package: "expo",
      version: stripRangePrefix(packages["expo"]),
      strategy: "expo",
      peerDepKey: "react-native"
    };
  }

  if (packages["react-native"] && !packages["expo"]) {
    return {
      package: "react-native",
      version: stripRangePrefix(packages["react-native"]),
      strategy: "peer-dep",
      peerDepKey: "react-native"
    };
  }

  if (packages["next"]) {
    return {
      package: "next",
      version: stripRangePrefix(packages["next"]),
      strategy: "peer-dep",
      peerDepKey: "react"
    };
  }

  if (packages["react"]) {
    return {
      package: "react",
      version: stripRangePrefix(packages["react"]),
      strategy: "peer-dep",
      peerDepKey: "react"
    };
  }

  return null;
}

/** True when a version spec looks like a non-registry reference (workspace, file:, git, url). */
export function isRegistryPackage(spec: string): boolean {
  const s = spec.trim();
  return (
    !s.startsWith("file:") &&
    !s.startsWith("workspace:") &&
    !s.startsWith("link:") &&
    !s.startsWith("portal:") &&
    !s.startsWith("git") &&
    !s.startsWith("github:") &&
    !s.startsWith("bitbucket:") &&
    !s.startsWith("http://") &&
    !s.startsWith("https://") &&
    !/^[./]/.test(s)
  );
}
