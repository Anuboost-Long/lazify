import fs from "node:fs";
import path from "node:path";

import { ensureLazifyDirectory } from "../projects/lazify-directory";
import { listExtensions } from "./manager";
import { PROVIDERS } from "./providers";

const MANIFEST_DIR = ".lazify";
const MANIFEST_NAME = "extensions.json";

interface ManifestEngine {
	id: string;
	name: string;
	source: string;
	version: string | null;
	enabled: boolean;
	status: string;
	extensions: string[];
	requirement: string | null;
}

interface ProjectManifest {
	generatedBy: string;
	generatedAt: string;
	description: string;
	engines: ManifestEngine[];
}

const DESCRIPTION =
	"Diagnostics engines Lazify runs over this project. An engine listed as enabled " +
	"is already underlining findings in the editor; its rules are the ones a fix has " +
	"to satisfy. Read this rather than assuming which linters are in play.";

function fileExtensionsFor(id: string): string[] {
	const provider = PROVIDERS.find((candidate) => candidate.entry.id === id);

	if (!provider) return [];

	const known = [
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
	];

	return known.filter((extension) => provider.languageIdFor(`probe${extension}`) !== null);
}

async function buildManifest(): Promise<ProjectManifest> {
	const states = await listExtensions();

	const engines: ManifestEngine[] = states.map((state) => ({
		id: state.entry.id,
		name: state.entry.displayName,
		source:
			PROVIDERS.find((provider) => provider.entry.id === state.entry.id)?.diagnosticSource ??
			state.entry.id,
		version: state.installed?.version ?? null,
		enabled: Boolean(state.installed?.enabled) && state.requirement.satisfied,
		status: state.status,
		extensions: fileExtensionsFor(state.entry.id),
		requirement: state.requirement.note,
	}));

	return {
		generatedBy: "lazify",
		generatedAt: new Date().toISOString(),
		description: DESCRIPTION,
		engines,
	};
}

/**
 * Kept out of the diff when nothing about the engines changed: the timestamp
 * alone would otherwise dirty the working tree on every agent launch.
 */
function unchanged(existing: string, next: ProjectManifest): boolean {
	try {
		const parsed = JSON.parse(existing) as ProjectManifest;

		return JSON.stringify(parsed.engines) === JSON.stringify(next.engines);
	} catch {
		return false;
	}
}

const written = new Set<string>();

/** Every project handed a manifest this session, so a toggle reaches all of them. */
export async function refreshWrittenManifests(): Promise<void> {
	await Promise.all(
		[...written].map((projectPath) => writeProjectExtensionManifest(projectPath).catch(() => null)),
	);
}

export async function writeProjectExtensionManifest(projectPath: string): Promise<string | null> {
	if (!projectPath || !fs.existsSync(projectPath)) return null;

	written.add(projectPath);

	const directory = path.join(projectPath, MANIFEST_DIR);
	const filePath = path.join(directory, MANIFEST_NAME);
	const manifest = await buildManifest();

	if (fs.existsSync(filePath) && unchanged(fs.readFileSync(filePath, "utf8"), manifest)) {
		return filePath;
	}

	ensureLazifyDirectory(projectPath, directory);
	fs.writeFileSync(filePath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

	return filePath;
}

export const projectManifestPath = (projectPath: string) =>
	path.join(projectPath, MANIFEST_DIR, MANIFEST_NAME);
