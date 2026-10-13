import { PROVIDERS } from "./providers";

/**
 * Which file extensions an engine can say anything about.
 *
 * The providers already answer this per file through `languageIdFor`, so the
 * lists here are read out of them rather than kept in step by hand: a provider
 * that learns a new language widens both the project manifest and what a scan
 * picks up, in the same commit that teaches it.
 */

const KNOWN = [
	".ts",
	".tsx",
	".mts",
	".cts",
	".js",
	".jsx",
	".mjs",
	".cjs",
	".java",
	".py",
	".php",
	".go",
	".cs",
	".html",
	".vue",
	".svelte",
	".astro",
	".css",
	".scss",
	".xml",
	".yaml",
	".yml",
	".tf",
	".md",
	".mdx",
	".rb",
	".sh",
	".json",
	".dockerfile",
];

export function extensionsFor(providerId: string): string[] {
	const provider = PROVIDERS.find((candidate) => candidate.entry.id === providerId);

	if (!provider) return [];

	return KNOWN.filter((extension) => provider.languageIdFor(`probe${extension}`) !== null);
}

/** Every extension any installed engine could analyse, for picking scan files. */
export function analyzableExtensions(): Set<string> {
	return new Set(
		KNOWN.filter((extension) =>
			PROVIDERS.some((provider) => provider.languageIdFor(`probe${extension}`) !== null),
		),
	);
}
