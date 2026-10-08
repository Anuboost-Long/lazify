import type { RegistryFetch } from "../registry";
import { compareVersions, isPreRelease, satisfies, stripRangePrefix } from "../semver-utils";

const REGISTRY_BASE = "https://registry.npmjs.org";

interface NpmVersionEntry {
  version: string;
  peerDependencies?: Record<string, string>;
}

interface NpmAbbreviatedManifest {
  "dist-tags": Record<string, string>;
  versions: Record<string, NpmVersionEntry>;
}

interface NpmLatestMeta {
  version: string;
  peerDependencies?: Record<string, string>;
}

async function fetchLatestMeta(registry: RegistryFetch, name: string): Promise<NpmLatestMeta | null> {
  try {
    return (await registry(`${REGISTRY_BASE}/${encodeURIComponent(name)}/latest`, {
      accept: "application/json",
      timeoutMs: 10000
    })) as NpmLatestMeta | null;
  } catch {
    return null;
  }
}

async function fetchAllVersions(
  registry: RegistryFetch,
  name: string
): Promise<NpmAbbreviatedManifest | null> {
  try {
    return (await registry(`${REGISTRY_BASE}/${encodeURIComponent(name)}`, {
      accept: "application/vnd.npm.install-v1+json",
      timeoutMs: 15000
    })) as NpmAbbreviatedManifest | null;
  } catch {
    return null;
  }
}

function sortedStableVersions(versions: Record<string, NpmVersionEntry>): string[] {
  return Object.keys(versions)
    .filter((v) => !isPreRelease(v))
    .sort((a, b) => compareVersions(b, a)); // descending
}

/**
 * Finds the latest version of `packageName` whose peerDependencies for
 * `anchorPeerKey` is satisfied by `anchorVersion`.
 *
 * Returns null when no compatible version could be found.
 */
export async function findCompatibleVersion(
  registry: RegistryFetch,
  packageName: string,
  anchorPeerKey: string,
  anchorVersion: string
): Promise<{ version: string; wasCompatible: boolean } | null> {
  const latest = await fetchLatestMeta(registry, packageName);
  if (!latest) return null;

  const latestPeerRange = latest.peerDependencies?.[anchorPeerKey];

  // Latest is compatible (or has no peer dep requirement for this anchor)
  if (!latestPeerRange || satisfies(anchorVersion, latestPeerRange)) {
    return { version: latest.version, wasCompatible: true };
  }

  // Latest is incompatible — search through all versions for the newest compatible one
  const manifest = await fetchAllVersions(registry, packageName);
  if (!manifest) return null;

  const versions = sortedStableVersions(manifest.versions);

  // Limit search to the 80 most-recent versions to keep it fast
  const candidates = versions.slice(0, 80);

  for (const ver of candidates) {
    const meta = manifest.versions[ver];
    const peerRange = meta?.peerDependencies?.[anchorPeerKey];
    if (!peerRange || satisfies(anchorVersion, peerRange)) {
      return { version: ver, wasCompatible: false };
    }
  }

  return null;
}

/**
 * Checks whether the currently installed version of a package is peer-dep
 * compatible with the anchor. Returns the peer range string when incompatible.
 */
export async function checkCurrentCompatibility(
  registry: RegistryFetch,
  packageName: string,
  currentVersion: string,
  anchorPeerKey: string,
  anchorVersion: string
): Promise<{ compatible: boolean; peerRange: string | null }> {
  try {
    const meta = (await registry(
      `${REGISTRY_BASE}/${encodeURIComponent(packageName)}/${encodeURIComponent(stripRangePrefix(currentVersion))}`,
      { accept: "application/json", timeoutMs: 10000 }
    )) as NpmVersionEntry | null;
    if (!meta) return { compatible: true, peerRange: null };

    const peerRange = meta.peerDependencies?.[anchorPeerKey] ?? null;

    if (!peerRange) return { compatible: true, peerRange: null };

    return {
      compatible: satisfies(anchorVersion, peerRange),
      peerRange
    };
  } catch {
    return { compatible: true, peerRange: null };
  }
}
