import type { AnchorInfo, MatchAction, PackageMatch, VersionMatchReport } from "./types";
import { detectAnchor, isRegistryPackage, readInstalledPackages } from "./read-project-packages";
import { fetchExpoCompatMap } from "./sources/expo-compat";
import { checkCurrentCompatibility, findCompatibleVersion } from "./sources/peer-dep-compat";
import { compareVersions, stripRangePrefix } from "./semver-utils";

export interface VersionMatchOptions {
  projectPath: string;
  /** When true, only report — do not modify anything. This is the "doctor" mode. */
  dryRun?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveAction(current: string, target: string): MatchAction {
  const cmp = compareVersions(current, target);
  if (cmp === 0) return "keep";
  return cmp < 0 ? "update" : "downgrade";
}

function formatInstallSpec(name: string, targetVersion: string): string {
  return `${name}@${targetVersion}`;
}

/** Run at most `limit` promises concurrently. */
async function pooled<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  async function run(): Promise<void> {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, run));
  return results;
}

// ---------------------------------------------------------------------------
// Package resolution
// ---------------------------------------------------------------------------

async function resolveViaExpoCompat(
  name: string,
  currentSpec: string,
  expoCompatMap: Record<string, string>
): Promise<PackageMatch | null> {
  const targetSpec = expoCompatMap[name];
  if (!targetSpec) return null;

  const currentVersion = stripRangePrefix(currentSpec);
  const targetVersion = stripRangePrefix(targetSpec);
  const action = deriveAction(currentVersion, targetVersion);

  return {
    name,
    currentSpec,
    currentVersion,
    targetVersion: targetSpec,
    action,
    compatibility: action === "keep" ? "compatible" : "incompatible",
    reason:
      action === "keep"
        ? `${name}@${currentVersion} matches the Expo SDK compat table.`
        : `Expo SDK requires ${name}@${targetSpec} (installed: ${currentVersion}).`
  };
}

async function resolveViaPeerDep(
  name: string,
  currentSpec: string,
  anchor: AnchorInfo
): Promise<PackageMatch> {
  const currentVersion = stripRangePrefix(currentSpec);

  // Step 1: check if currently installed version is already peer-compatible
  const { compatible, peerRange } = await checkCurrentCompatibility(
    name,
    currentVersion,
    anchor.peerDepKey,
    anchor.version
  );

  if (compatible) {
    return {
      name,
      currentSpec,
      currentVersion,
      targetVersion: null,
      action: "keep",
      compatibility: "compatible",
      reason: peerRange
        ? `${name}@${currentVersion} satisfies peer requirement ${anchor.peerDepKey}@${peerRange}.`
        : `${name}@${currentVersion} has no ${anchor.peerDepKey} peer requirement — assumed compatible.`
    };
  }

  // Step 2: find the latest compatible version
  const found = await findCompatibleVersion(name, anchor.peerDepKey, anchor.version);

  if (!found) {
    return {
      name,
      currentSpec,
      currentVersion,
      targetVersion: null,
      action: "keep",
      compatibility: "unknown",
      reason: `Could not determine a compatible version of ${name} for ${anchor.peerDepKey}@${anchor.version}.`
    };
  }

  const targetVersion = found.version;
  const action = deriveAction(currentVersion, targetVersion);

  return {
    name,
    currentSpec,
    currentVersion,
    targetVersion,
    action,
    compatibility: "incompatible",
    reason: `${name}@${currentVersion} declares peer ${anchor.peerDepKey}@${peerRange ?? "?"} which does not satisfy ${anchor.version}. Compatible version: ${targetVersion}.`
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function matchPackageVersions(
  options: VersionMatchOptions
): Promise<VersionMatchReport> {
  const { projectPath } = options;

  const installed = await readInstalledPackages(projectPath);
  const anchor = detectAnchor(installed.all);

  if (!anchor) {
    return {
      projectPath,
      anchorPackage: "unknown",
      anchorVersion: "unknown",
      packages: [],
      unresolved: [],
      installPlan: []
    };
  }

  // For expo projects, pre-fetch the compat table once
  const expoCompatMap =
    anchor.strategy === "expo" ? await fetchExpoCompatMap(anchor.version) : {};

  // Build resolution tasks for each installed package (exclude the anchor itself)
  const entries = Object.entries(installed.all).filter(
    ([name, spec]) => name !== anchor.package && isRegistryPackage(spec)
  );

  const tasks = entries.map(
    ([name, spec]) =>
      async (): Promise<PackageMatch | null> => {
        try {
          // Try expo compat map first for expo-strategy projects
          if (anchor.strategy === "expo") {
            const expoResult = await resolveViaExpoCompat(name, spec, expoCompatMap);
            if (expoResult) return expoResult;
          }

          // Fall back to peerDep resolution for all other packages
          return await resolveViaPeerDep(name, spec, anchor);
        } catch {
          return null;
        }
      }
  );

  // Run with a concurrency limit of 6 to avoid hammering the registry
  const results = await pooled(tasks, 6);

  const packages: PackageMatch[] = [];
  const unresolved: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (!result) {
      unresolved.push(entries[i][0]);
    } else {
      packages.push(result);
    }
  }

  const installPlan = packages
    .filter((p) => p.action !== "keep" && p.targetVersion !== null)
    .map((p) => formatInstallSpec(p.name, p.targetVersion!));

  return {
    projectPath,
    anchorPackage: anchor.package,
    anchorVersion: anchor.version,
    packages,
    unresolved,
    installPlan
  };
}
