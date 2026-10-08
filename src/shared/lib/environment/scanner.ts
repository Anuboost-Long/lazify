import { execFile as execFileAsync } from "@/platform/exec";

import type { ProjectReader } from "../stack-detection/project-reader";

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

async function inspectBinary(
  name: CommandBinary | "node",
  args: string[] = ["--version"]
): Promise<BinaryStatus> {
  try {
    const result = await execFileAsync(name, args, { timeout: 5000 });

    return {
      name,
      available: true,
      version: (result.stdout || result.stderr).trim() || null
    };
  } catch {
    return {
      name,
      available: false,
      version: null
    };
  }
}

export async function scanEnvironment(): Promise<EnvironmentScan> {
  const [node, npm, yarn, npx] = await Promise.all([
    inspectBinary("node"),
    inspectBinary("npm"),
    inspectBinary("yarn"),
    inspectBinary("npx")
  ]);
  const binaries = { node, npm, yarn, npx };
  const nodeVersion = node.version ?? "not installed";

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

export async function ensureCommandAvailable(command: string): Promise<void> {
  const scan = await scanEnvironment();

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

export async function choosePackageManager(project?: ProjectReader): Promise<PackageManager> {
  const scan = await scanEnvironment();

  if (project) {
    if ((await project.exists("yarn.lock")) && scan.binaries.yarn.available) {
      return "yarn";
    }

    if ((await project.exists("package-lock.json")) && scan.binaries.npm.available) {
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
