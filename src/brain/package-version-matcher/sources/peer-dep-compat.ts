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

async function fetchLatestMeta(name: string): Promise<NpmLatestMeta | null> {
  try {
    const response = await fetch(`${REGISTRY_BASE}/${encodeURIComponent(name)}/latest`, {
      headers: { Accept: "application/json", "User-Agent": "lazify/0.1.0" },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) return null;
    return (await response.json()) as NpmLatestMeta;
  } catch {
    return null;
  }
}

async function fetchAllVersions(name: string): Promise<NpmAbbreviatedManifest | null> {
  try {
    const response = await fetch(`${REGISTRY_BASE}/${encodeURIComponent(name)}`, {
      headers: {
        Accept: "application/vnd.npm.install-v1+json",
        "User-Agent": "lazify/0.1.0"
      },
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) return null;
    return (await response.json()) as NpmAbbreviatedManifest;
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
  packageName: string,
  anchorPeerKey: string,
  anchorVersion: string
): Promise<{ version: string; wasCompatible: boolean } | null> {
  const latest = await fetchLatestMeta(packageName);
  if (!latest) return null;

  const latestPeerRange = latest.peerDependencies?.[anchorPeerKey];

  // Latest is compatible (or has no peer dep requirement for this anchor)
  if (!latestPeerRange || satisfies(anchorVersion, latestPeerRange)) {
    return { version: latest.version, wasCompatible: true };
  }

  // Latest is incompatible — search through all versions for the newest compatible one
  const manifest = await fetchAllVersions(packageName);
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
  packageName: string,
  currentVersion: string,
  anchorPeerKey: string,
  anchorVersion: string
): Promise<{ compatible: boolean; peerRange: string | null }> {
  try {
    const response = await fetch(
      `${REGISTRY_BASE}/${encodeURIComponent(packageName)}/${encodeURIComponent(stripRangePrefix(currentVersion))}`,
      {
        headers: { Accept: "application/json", "User-Agent": "lazify/0.1.0" },
        signal: AbortSignal.timeout(10000)
      }
    );
    if (!response.ok) return { compatible: true, peerRange: null };

    const meta = (await response.json()) as NpmVersionEntry;
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
