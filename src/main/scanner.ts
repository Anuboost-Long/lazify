import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export type PackageManager = "npm" | "yarn";
export type CommandBinary = PackageManager | "npx";

export interface BinaryStatus {
  name: string;
  available: boolean;
  version: string | null;
}

export interface EnvironmentScan {
  nodeVersion: string;
  binaries: Record<CommandBinary | "node", BinaryStatus>;
  issues: string[];
}

const MIN_NODE_MAJOR = 18;

function getNodeMajor(version: string): number {
  return Number(version.replace(/^v/, "").split(".")[0] ?? 0);
}

function inspectBinary(name: CommandBinary | "node", args: string[] = ["--version"]): BinaryStatus {
  const result = spawnSync(name, args, {
    encoding: "utf8",
    shell: process.platform === "win32"
  });

  if (result.error || result.status !== 0) {
    return {
      name,
      available: false,
      version: null
    };
  }

  return {
    name,
    available: true,
    version: (result.stdout || result.stderr).trim() || null
  };
}

export function scanEnvironment(): EnvironmentScan {
  const nodeVersion = process.version;
  const binaries = {
    node: inspectBinary("node"),
    npm: inspectBinary("npm"),
    yarn: inspectBinary("yarn"),
    npx: inspectBinary("npx")
  };

  const issues: string[] = [];

  if (getNodeMajor(nodeVersion) < MIN_NODE_MAJOR) {
    issues.push(`Node.js ${MIN_NODE_MAJOR}+ is required. Detected ${nodeVersion}.`);
  }

  if (!binaries.npm.available && !binaries.yarn.available) {
    issues.push("Install npm or yarn before running Lazify workflows.");
  }

  return {
    nodeVersion,
    binaries,
    issues
  };
}

export function ensureCommandAvailable(command: string): void {
  const scan = scanEnvironment();

  if (scan.issues.length > 0) {
    throw new Error(scan.issues.join(" "));
  }

  if (command === "npm" && !scan.binaries.npm.available) {
    throw new Error("npm is not installed or is not on PATH.");
  }

  if (command === "yarn" && !scan.binaries.yarn.available) {
    throw new Error("yarn is not installed or is not on PATH.");
  }

  if (command === "npx" && !scan.binaries.npx.available) {
    throw new Error("npx is not installed or is not on PATH.");
  }
}

export function choosePackageManager(projectPath?: string): PackageManager {
  const scan = scanEnvironment();

  if (projectPath) {
    const yarnLockPath = path.join(projectPath, "yarn.lock");
    const packageLockPath = path.join(projectPath, "package-lock.json");

    if (fs.existsSync(yarnLockPath) && scan.binaries.yarn.available) {
      return "yarn";
    }

    if (fs.existsSync(packageLockPath) && scan.binaries.npm.available) {
      return "npm";
    }
  }

  if (scan.binaries.npm.available) {
    return "npm";
  }

  if (scan.binaries.yarn.available) {
    return "yarn";
  }

  throw new Error("No supported package manager was found. Install npm or yarn.");
}
