export type MatchAction = "keep" | "update" | "downgrade";

export type CompatibilityStatus = "compatible" | "incompatible" | "unknown";

export interface PackageMatch {
  name: string;
  /** Version spec as written in package.json, e.g. "^18.2.0" */
  currentSpec: string;
  /** Bare semver stripped of range prefix, e.g. "18.2.0" */
  currentVersion: string;
  /** Version to install for compatibility, null when not resolvable */
  targetVersion: string | null;
  action: MatchAction;
  compatibility: CompatibilityStatus;
  /** Human-readable explanation of the finding */
  reason: string;
}

export interface VersionMatchReport {
  projectPath: string;
  /** The package used as the compatibility anchor (expo, react, next, react-native) */
  anchorPackage: string;
  /** Resolved bare version of the anchor package */
  anchorVersion: string;
  packages: PackageMatch[];
  /** Packages for which no compatible version could be determined */
  unresolved: string[];
  /** Ready-to-pass-to-installer strings, e.g. ["expo-router@~4.0.17", "jotai@2.12.5"] */
  installPlan: string[];
}

export interface InstalledPackages {
  /** Merged dependencies + devDependencies, name → spec */
  all: Record<string, string>;
  devNames: Set<string>;
}

export interface AnchorInfo {
  package: string;
  version: string;
  /** Whether to use the expo compat table strategy */
  strategy: "expo" | "peer-dep";
  /** The peerDep key to check against (react, react-native) */
  peerDepKey: string;
}
