import fs from "node:fs";
import path from "node:path";

/**
 * The files a project scan reads.
 *
 * What the project builds, not what it installs: the walk starts at the folders
 * a project keeps its own code in and never descends into a dependency, a build
 * output or a cache. A project that keeps its code somewhere else is walked from
 * its root under the same exclusions rather than reported as having nothing.
 */

const ROOT_FOLDERS = ["src", "app"];

const SKIP = new Set([
	"node_modules",
	"dist",
	"build",
	"out",
	"release",
	"coverage",
	"vendor",
	"__snapshots__",
]);

const EXTENSIONS = new Set([".tsx", ".jsx"]);

/** Past this a scan outlasts anyone's patience; what is left out is counted. */
const MAX_FILES = 1000;

export interface ScanFileSet {
	files: string[];
	/** Folders the files came from, relative to the project. */
	roots: string[];
	skipped: number;
}

function walk(directory: string, found: string[]): void {
	let entries: fs.Dirent[];

	try {
		entries = fs.readdirSync(directory, { withFileTypes: true });
	} catch {
		return;
	}

	for (const entry of entries) {
		if (entry.name.startsWith(".") || SKIP.has(entry.name)) continue;

		const entryPath = path.join(directory, entry.name);

		if (entry.isDirectory()) walk(entryPath, found);
		else if (EXTENSIONS.has(path.extname(entry.name).toLowerCase())) found.push(entryPath);
	}
}

export function collectScanFiles(projectPath: string): ScanFileSet {
	const resolved = path.resolve(projectPath);
	const roots = ROOT_FOLDERS.filter((name) => fs.existsSync(path.join(resolved, name)));
	const found: string[] = [];

	for (const root of roots.length > 0 ? roots : [""]) walk(path.join(resolved, root), found);

	/** Path order keeps a folder together, which is what a phase is cut along. */
	found.sort((left, right) => left.localeCompare(right));

	return {
		files: found.slice(0, MAX_FILES),
		roots: roots.length > 0 ? roots : ["."],
		skipped: Math.max(0, found.length - MAX_FILES),
	};
}
