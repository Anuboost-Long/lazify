import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface NpmPackageSearchResult {
  name: string;
  version: string;
  description: string;
  keywords: string[];
  publisher: string | null;
}

interface RegistrySearchResponse {
  objects?: Array<{
    package: {
      name: string;
      version: string;
      description?: string;
      keywords?: string[];
      publisher?: {
        username?: string;
      };
    };
  }>;
}

interface NpmCliSearchEntry {
  name?: string;
  version?: string;
  description?: string;
  keywords?: string[] | string;
  author?: {
    name?: string;
  } | string;
  maintainers?: Array<{
    username?: string;
  }>;
}

export async function searchNpmPackages(query: string): Promise<NpmPackageSearchResult[]> {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    return [];
  }

  try {
    return await searchViaFetch(normalizedQuery);
  } catch {
    try {
      return await searchViaNpmCli(normalizedQuery);
    } catch {
      throw new Error(
        "Unable to reach npm search right now. Check your internet connection or npm proxy configuration."
      );
    }
  }
}

async function searchViaFetch(query: string): Promise<NpmPackageSearchResult[]> {
  const url = new URL("https://registry.npmjs.org/-/v1/search");
  url.searchParams.set("text", query);
  url.searchParams.set("size", "8");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "lazify/0.1.0"
    },
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) {
    throw new Error(`npm registry search failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as RegistrySearchResponse;

  return (payload.objects ?? []).map(({ package: pkg }) => ({
    name: pkg.name,
    version: pkg.version,
    description: pkg.description ?? "",
    keywords: pkg.keywords ?? [],
    publisher: pkg.publisher?.username ?? null
  }));
}

async function searchViaNpmCli(query: string): Promise<NpmPackageSearchResult[]> {
  const { stdout } = await execFileAsync(
    "npm",
    ["search", query, "--json", "--searchlimit=8"],
    {
      timeout: 10000,
      maxBuffer: 1024 * 1024
    }
  );

  const payload = JSON.parse(stdout || "[]") as NpmCliSearchEntry[];

  return payload.map((pkg) => ({
    name: pkg.name ?? "",
    version: pkg.version ?? "",
    description: pkg.description ?? "",
    keywords: Array.isArray(pkg.keywords)
      ? pkg.keywords
      : typeof pkg.keywords === "string"
        ? pkg.keywords.split(/[,\s]+/).filter(Boolean)
        : [],
    publisher:
      typeof pkg.author === "object" && pkg.author?.name
        ? pkg.author.name
        : typeof pkg.author === "string"
          ? pkg.author
          : pkg.maintainers?.[0]?.username ?? null
  }));
}

/**
 * Peer requirements a specific published version declares. Used to reject a
 * "latest" that would not actually work against the scaffolded project.
 */
export async function fetchPackagePeerDependencies(
  packageName: string,
  version: string
): Promise<Record<string, string> | null> {
  try {
    const response = await fetch(
      `https://registry.npmjs.org/${encodeURIComponent(packageName)}/${encodeURIComponent(version)}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "lazify/0.1.0"
        },
        signal: AbortSignal.timeout(8000)
      }
    );

    if (!response.ok) {
      return null;
    }

    const manifest = (await response.json()) as { peerDependencies?: Record<string, string> };
    return manifest.peerDependencies ?? {};
  } catch {
    return null;
  }
}

export async function fetchLatestPackageVersion(packageName: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://registry.npmjs.org/-/package/${encodeURIComponent(packageName)}/dist-tags`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "lazify/0.1.0"
        },
        signal: AbortSignal.timeout(8000)
      }
    );

    if (!response.ok) {
      return null;
    }

    const tags = (await response.json()) as Record<string, string>;
    return tags.latest ?? null;
  } catch {
    return null;
  }
}
