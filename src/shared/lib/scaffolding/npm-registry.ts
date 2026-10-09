import { execFile } from "@/platform/exec";
import { getJson } from "@/platform/http";

const REGISTRY_HEADERS = { Accept: "application/json", "User-Agent": "lazify/0.1.0" };

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
	author?:
		| {
				name?: string;
		  }
		| string;
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
				"Unable to reach npm search right now. Check your internet connection or npm proxy configuration.",
			);
		}
	}
}

async function searchViaFetch(query: string): Promise<NpmPackageSearchResult[]> {
	const url = new URL("https://registry.npmjs.org/-/v1/search");
	url.searchParams.set("text", query);
	url.searchParams.set("size", "8");

	const response = await getJson(url.toString(), REGISTRY_HEADERS, 8000);

	if (!response.ok) {
		throw new Error(`npm registry search failed with status ${response.status}.`);
	}

	const payload = response.data as RegistrySearchResponse;

	return (payload.objects ?? []).map(({ package: pkg }) => ({
		name: pkg.name,
		version: pkg.version,
		description: pkg.description ?? "",
		keywords: pkg.keywords ?? [],
		publisher: pkg.publisher?.username ?? null,
	}));
}

function cliKeywords(keywords: NpmCliSearchEntry["keywords"]): string[] {
	if (Array.isArray(keywords)) return keywords;
	if (typeof keywords === "string") return keywords.split(/[,\s]+/).filter(Boolean);

	return [];
}

function cliPublisher(pkg: NpmCliSearchEntry): string | null {
	if (typeof pkg.author === "object" && pkg.author?.name) return pkg.author.name;
	if (typeof pkg.author === "string") return pkg.author;

	return pkg.maintainers?.[0]?.username ?? null;
}

async function searchViaNpmCli(query: string): Promise<NpmPackageSearchResult[]> {
	const { stdout } = await execFile("npm", ["search", query, "--json", "--searchlimit=8"], {
		timeout: 10000,
		maxBuffer: 1024 * 1024,
	});

	const payload = JSON.parse(stdout || "[]") as NpmCliSearchEntry[];

	return payload.map((pkg) => ({
		name: pkg.name ?? "",
		version: pkg.version ?? "",
		description: pkg.description ?? "",
		keywords: cliKeywords(pkg.keywords),
		publisher: cliPublisher(pkg),
	}));
}

/**
 * Peer requirements a specific published version declares. Used to reject a
 * "latest" that would not actually work against the scaffolded project.
 */
export async function fetchPackagePeerDependencies(
	packageName: string,
	version: string,
): Promise<Record<string, string> | null> {
	try {
		const response = await getJson(
			`https://registry.npmjs.org/${encodeURIComponent(packageName)}/${encodeURIComponent(version)}`,
			REGISTRY_HEADERS,
			8000,
		);

		if (!response.ok) {
			return null;
		}

		const manifest = response.data as { peerDependencies?: Record<string, string> };
		return manifest.peerDependencies ?? {};
	} catch {
		return null;
	}
}

export async function fetchLatestPackageVersion(packageName: string): Promise<string | null> {
	try {
		const response = await getJson(
			`https://registry.npmjs.org/-/package/${encodeURIComponent(packageName)}/dist-tags`,
			REGISTRY_HEADERS,
			8000,
		);

		if (!response.ok) {
			return null;
		}

		const tags = response.data as Record<string, string>;
		return tags.latest ?? null;
	} catch {
		return null;
	}
}
