import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { analyzableExtensions } from "../../extensions/source-extensions";

/**
 * The files a project scan reads.
 *
 * Everything the project keeps, wherever it keeps it. Git already knows which
 * paths are the project's own and which are installed, built or generated, so
 * its ignore rules draw the line rather than a list of folder names guessed
 * here. A checkout is not required: a project outside git is walked from its
 * root, skipping the folders that are dependencies or output by convention.
 * `node_modules` stays out either way, ignored or not, and so do tests: a scan
 * is for the code that ships, and a fix phase should never be spent rewriting
 * the thing that proves the fix.
 */

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

/** Both conventions: tests kept in their own folder, and tests kept beside the
    code they cover. */
const TEST_DIRECTORIES = new Set(["test", "tests", "__tests__", "__mocks__", "e2e", "cypress"]);
const TEST_FILE = /\.(test|spec)\.[^.]+$/i;

const GIT_TIMEOUT_MS = 10_000;
const GIT_MAX_BUFFER = 64 * 1024 * 1024;

/** Past this a scan outlasts anyone's patience; what is left out is counted. */
const MAX_FILES = 1000;

export interface ScanFileSet {
	files: string[];
	/** Folders the files came from, relative to the project. */
	roots: string[];
	skipped: number;
}

function analyzable(filePath: string): boolean {
	return analyzableExtensions().has(path.extname(filePath).toLowerCase());
}

function installed(relativePath: string): boolean {
	return relativePath.split(/[\\/]/).includes("node_modules");
}

function test(relativePath: string): boolean {
	const segments = relativePath.split(/[\\/]/);
	const name = segments.pop() ?? "";

	return (
		TEST_FILE.test(name) || segments.some((segment) => TEST_DIRECTORIES.has(segment.toLowerCase()))
	);
}

/**
 * Tracked files plus untracked ones git would show — which is every path the
 * repository considers its own, and nothing it was told to ignore. Null when
 * the project is not a git checkout, or git is not installed to ask.
 */
function gitFiles(projectPath: string): string[] | null {
	try {
		const listing = execFileSync(
			"git", // NOSONAR: git lives at a different absolute path on every platform, so PATH is the only portable way to find it
			["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
			{
				cwd: projectPath,
				encoding: "utf8",
				timeout: GIT_TIMEOUT_MS,
				maxBuffer: GIT_MAX_BUFFER,
				stdio: ["ignore", "pipe", "ignore"],
			},
		);

		return listing.split("\0").filter(Boolean);
	} catch {
		return null;
	}
}

function walk(directory: string, prefix: string, found: string[]): void {
	let entries: fs.Dirent[];

	try {
		entries = fs.readdirSync(directory, { withFileTypes: true });
	} catch {
		return;
	}

	for (const entry of entries) {
		if (entry.name.startsWith(".") || SKIP.has(entry.name)) continue;

		const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

		if (entry.isDirectory()) walk(path.join(directory, entry.name), relativePath, found);
		else found.push(relativePath);
	}
}

/** The top folder a file sits in, so a report can say where it looked. */
function rootOf(projectPath: string, filePath: string): string {
	const segments = path.relative(projectPath, filePath).split(path.sep);

	return segments.length > 1 ? segments[0] : ".";
}

export function collectScanFiles(projectPath: string): ScanFileSet {
	const resolved = path.resolve(projectPath);
	const walked: string[] = [];
	const tracked = gitFiles(resolved);

	if (!tracked) walk(resolved, "", walked);

	const found = (tracked ?? walked)
		.filter(
			(relativePath) => analyzable(relativePath) && !installed(relativePath) && !test(relativePath),
		)
		.map((relativePath) => path.join(resolved, relativePath))
		// `--cached` lists what the index holds, which outlives a deletion.
		.filter((filePath) => fs.existsSync(filePath));

	/** Path order keeps a folder together, which is what a phase is cut along. */
	found.sort((left, right) => left.localeCompare(right));

	const roots = [...new Set(found.map((filePath) => rootOf(resolved, filePath)))];

	return {
		files: found.slice(0, MAX_FILES),
		roots: roots.length > 0 ? roots : ["."],
		skipped: Math.max(0, found.length - MAX_FILES),
	};
}
