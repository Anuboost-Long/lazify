import { execFile } from "@/platform/exec";
import { listFolder } from "@/platform/folders";
import { analyzableExtensions } from "@/shared/lib/extensions/source-extensions";
import path from "@/shared/lib/path";

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

/** One run's slice of the project, so a scan stays minutes rather than hours. */
export const BATCH_SIZE = 1000;

export interface ScanBatch {
	/** 1-based and inclusive, counted over every analyzable file in path order. */
	start: number;
	end: number;
	total: number;
}

export interface ScanFileSet {
	files: string[];
	/** Folders the files came from, relative to the project. */
	roots: string[];
	batch: ScanBatch;
	/** The file a clean batch hands on to; null once the last one is covered. */
	nextCursor: string | null;
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

const gitList = async (projectPath: string, args: string[]) =>
	(
		await execFile(
			"git",
			["ls-files", ...args, "-z"],
			{ cwd: projectPath, timeout: GIT_TIMEOUT_MS, maxBuffer: GIT_MAX_BUFFER },
		)
	).stdout
		.split("\0")
		.filter(Boolean);

/**
 * Tracked files plus untracked ones git would show — which is every path the
 * repository considers its own, and nothing it was told to ignore. Null when
 * the project is not a git checkout, or git is not installed to ask.
 *
 * `--cached` lists what the index holds, which outlives a deletion, so the
 * deleted ones are asked for too and left out.
 */
async function gitFiles(projectPath: string): Promise<string[] | null> {
	try {
		const [listed, deleted] = await Promise.all([
			gitList(projectPath, ["--cached", "--others", "--exclude-standard"]),
			gitList(projectPath, ["--deleted"]),
		]);
		const gone = new Set(deleted);

		return listed.filter((relativePath) => !gone.has(relativePath));
	} catch {
		return null;
	}
}

async function walk(directory: string, prefix: string, found: string[]): Promise<void> {
	let entries: Awaited<ReturnType<typeof listFolder>>;

	try {
		entries = await listFolder(directory);
	} catch {
		return;
	}

	for (const entry of entries) {
		if (entry.name.startsWith(".") || SKIP.has(entry.name)) continue;

		const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

		if (entry.kind === "folder") await walk(entry.path, relativePath, found);
		else found.push(relativePath);
	}
}

/** The top folder a file sits in, so a report can say where it looked. */
function rootOf(relativePath: string): string {
	const segments = relativePath.split("/");

	return segments.length > 1 ? segments[0] : ".";
}

/**
 * Where this run picks up. A cursor names the file the last run handed on to;
 * the first path at or after it survives that file being renamed or deleted
 * between runs.
 */
function startIndex(found: string[], cursor: string | null): number {
	if (!cursor) return 0;

	const index = found.findIndex((relativePath) => relativePath.localeCompare(cursor) >= 0);

	return index === -1 ? 0 : index;
}

export async function collectScanFiles(
	projectPath: string,
	cursor: string | null = null,
): Promise<ScanFileSet> {
	const resolved = path.resolve(projectPath);
	const walked: string[] = [];
	const tracked = await gitFiles(resolved);

	if (!tracked) await walk(resolved, "", walked);

	const found = (tracked ?? walked).filter(
		(relativePath) => analyzable(relativePath) && !installed(relativePath) && !test(relativePath),
	);

	/** Path order keeps a folder together, which is what a phase is cut along. */
	found.sort((left, right) => left.localeCompare(right));

	const start = startIndex(found, cursor);
	const slice = found.slice(start, start + BATCH_SIZE);
	const end = start + slice.length;
	const roots = [...new Set(slice.map(rootOf))];

	return {
		files: slice.map((relativePath) => path.join(resolved, relativePath)),
		roots: roots.length > 0 ? roots : ["."],
		batch: { start: slice.length === 0 ? 0 : start + 1, end, total: found.length },
		nextCursor: end < found.length ? found[end] : null,
	};
}
