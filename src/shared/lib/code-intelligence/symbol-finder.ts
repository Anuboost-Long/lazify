import { filesContaining } from "@/platform/exec";
import { type FolderTreeEntry, listFolderTree, readTextLossy } from "@/platform/folders";
import path from "@/shared/lib/path";

/**
 * "Where does this component come from?" — answered by reading the project,
 * not by hosting a language server.
 *
 * A click in a read-only editor gives one thing to work with: a name. This
 * looks for the place that name is declared, ranks what it finds, and hands
 * back a file and a line. It is deliberately a heuristic — no type resolution,
 * no import following, no scope analysis — because a wrong jump costs a click
 * and the right one saves a search across the tree.
 *
 * What keeps it fast enough for a click is the ordering: the file named after
 * the symbol is read first, and an exported declaration ends the walk.
 */

/** Directories that never hold a definition the user is reading. */
const IGNORED_DIRECTORY_NAMES = new Set([
	".git",
	"node_modules",
	"dist",
	"build",
	".next",
	".expo",
	".turbo",
	"coverage",
	"bin",
	"obj",
	".vs",
	"TestResults",
]);

/** Sources worth scanning. Anything else cannot declare a symbol we resolve. */
const SOURCE_EXTENSIONS = new Set([
	".ts",
	".tsx",
	".js",
	".jsx",
	".mjs",
	".cjs",
	".mts",
	".cts",
	".vue",
	".svelte",
	".cs",
]);

/** A generated bundle can be megabytes of one line; it is never the answer. */
const MAX_FILE_BYTES = 512 * 1024;
/** Ceiling on the walk, so a monorepo cannot turn a click into a stall. */
const MAX_FILES = 6000;
/** How long a project's file list stays good enough to reuse. */
const FILE_LIST_TTL_MS = 30_000;

export interface SymbolDefinition {
	absolutePath: string;
	relativePath: string;
	/** 1-based, so it can be handed straight to an editor gutter. */
	line: number;
	/** How the match was made, for callers that want to say. */
	kind: "export" | "declaration" | "file";
}

interface FileListEntry {
	files: string[];
	readAt: number;
}

const fileListCache = new Map<string, FileListEntry>();

/** Sizes from the listing, so a file too big to read is skipped without asking again. */
const fileSizes = new Map<string, number>();

/** A file's text, or null when it can't be read. */
export function readText(filePath: string): Promise<string | null> {
	return readTextLossy(filePath).catch(() => null);
}

/** Only a plain identifier can be resolved; anything else is not a symbol. */
function isIdentifier(symbol: string): boolean {
	return /^[A-Za-z_$][\w$]*$/.test(symbol);
}

/**
 * Declaration sites, most specific first. Every pattern is anchored at the
 * start of a line (after indentation) so a mention inside an expression or an
 * argument list is not mistaken for a declaration.
 */
function declarationPatterns(
	symbol: string,
): { pattern: RegExp; kind: "export" | "declaration" }[] {
	const name = symbol.replace(/[$]/g, String.raw`\$&`);

	return [
		// export function Foo / export default class Foo / export const Foo
		{
			pattern: new RegExp(
				String.raw`^\s*export\s+(?:default\s+)?(?:async\s+)?(?:function\*?|class|const|let|var|interface|type|enum|abstract\s+class)\s+${name}\b`,
			),
			kind: "export",
		},
		// export { Foo } — a barrel, but still a lead worth following.
		{ pattern: new RegExp(String.raw`^\s*export\s*\{[^}]*\b${name}\b`), kind: "export" },
		// function Foo / class Foo / const Foo = ...
		{
			pattern: new RegExp(
				String.raw`^\s*(?:async\s+)?(?:function\*?|class|const|let|var|interface|type|enum)\s+${name}\b`,
			),
			kind: "declaration",
		},
		// C# and other brace languages: public sealed class Foo, private void Foo(
		{
			pattern: new RegExp(
				String.raw`^\s*(?:public|private|protected|internal|static|sealed|partial|abstract|virtual|override|async|\s)*\b(?:class|record|struct|interface|enum)\s+${name}\b`,
			),
			kind: "declaration",
		},
	];
}

/**
 * The first declaration of `symbol` in one file's text, most specific pattern
 * first. Shared with the reference finder, which asks the same question of a
 * file it reached by following an import rather than by ranking the project.
 */
export function declarationLine(
	contents: string,
	symbol: string,
): { line: number; kind: "export" | "declaration" } | null {
	const patterns = declarationPatterns(symbol);
	const lines = contents.split("\n");

	for (let index = 0; index < lines.length; index += 1) {
		const match = patterns.find((candidate) => candidate.pattern.test(lines[index]));
		if (match) return { line: index + 1, kind: match.kind };
	}

	return null;
}

/**
 * Every folder's entries, from one listing that never enters an ignored
 * folder. A folder that cannot be read simply holds no answer.
 */
async function listFolders(projectPath: string): Promise<Map<string, FolderTreeEntry[]>> {
	const folders = new Map<string, FolderTreeEntry[]>();
	let entries: FolderTreeEntry[];

	try {
		entries = await listFolderTree(projectPath, [...IGNORED_DIRECTORY_NAMES]);
	} catch {
		return folders;
	}

	for (const entry of entries) {
		const folder = path.dirname(entry.path);
		folders.set(folder, [...(folders.get(folder) ?? []), entry]);
		if (entry.kind === "file") fileSizes.set(entry.path, entry.size);
	}

	return folders;
}

function collectEntry(entry: FolderTreeEntry, files: string[], queue: string[]): void {
	if (entry.kind === "symlink") return;

	const name = path.basename(entry.path);

	if (entry.kind === "folder") {
		if (!IGNORED_DIRECTORY_NAMES.has(name)) queue.push(entry.path);
		return;
	}

	if (entry.kind === "file" && SOURCE_EXTENSIONS.has(path.extname(name).toLowerCase())) {
		files.push(entry.path);
	}
}

/** Shared with the module resolver, which walks the same files for a path. */
export async function collectSourceFiles(projectPath: string): Promise<string[]> {
	const cached = fileListCache.get(projectPath);
	if (cached && Date.now() - cached.readAt < FILE_LIST_TTL_MS) return cached.files;

	const folders = await listFolders(projectPath);
	const files: string[] = [];
	const queue: string[] = [path.resolve(projectPath)];

	while (queue.length > 0 && files.length < MAX_FILES) {
		const current = queue.shift();
		if (!current) break;

		for (const entry of folders.get(current) ?? []) {
			collectEntry(entry, files, queue);
		}
	}

	fileListCache.set(projectPath, { files, readAt: Date.now() });

	return files;
}

/**
 * Files in the order most likely to hold the answer: the one named after the
 * symbol, then its index barrels, then the rest shortest-path first — which
 * puts `src/` ahead of a fixture buried six levels down.
 */
function rankFiles(files: string[], symbol: string): string[] {
	const lowered = symbol.toLowerCase();

	const score = (filePath: string) => {
		const base = path.basename(filePath, path.extname(filePath)).toLowerCase();
		if (base === lowered) return 0;
		if (base === "index") return 2;
		return 1;
	};

	return [...files].sort((a, b) => {
		const byScore = score(a) - score(b);
		if (byScore !== 0) return byScore;
		return a.length - b.length;
	});
}

/** The file's text, or null when it cannot be read or is too big to be worth reading. */
async function readSource(filePath: string): Promise<string | null> {
	if ((fileSizes.get(filePath) ?? 0) > MAX_FILE_BYTES) return null;

	return readText(filePath);
}

const namedAfter = (filePath: string, symbol: string) =>
	path.basename(filePath, path.extname(filePath)).toLowerCase() === symbol.toLowerCase();

/**
 * The ranked files, minus those that can't hold the answer. The files named
 * after the symbol come first and usually settle it; only past them is grep
 * asked which of the rest mention the symbol at all, since every other file
 * would be read only to be skipped.
 */
async function* filesToRead(ranked: string[], symbol: string): AsyncGenerator<string> {
	const named = ranked.findIndex((filePath) => !namedAfter(filePath, symbol));
	const split = named === -1 ? ranked.length : named;

	yield* ranked.slice(0, split);

	const rest = ranked.slice(split).filter((filePath) => (fileSizes.get(filePath) ?? 0) <= MAX_FILE_BYTES);
	const mentioning = await filesContaining(symbol, rest);

	yield* rest.filter((filePath) => mentioning.has(filePath));
}

/**
 * The best declaration of `symbol` inside `projectPath`, or null.
 *
 * Stops at the first exported declaration: that is the one an import would have
 * resolved to, so nothing later can be a better answer.
 */
export async function findSymbolDefinition(
	projectPath: string,
	symbol: string,
): Promise<SymbolDefinition | null> {
	if (!projectPath || !isIdentifier(symbol)) return null;

	const files = rankFiles(await collectSourceFiles(projectPath), symbol);
	/** Kept in case nothing exported turns up. */
	let fallback: SymbolDefinition | null = null;

	for await (const filePath of filesToRead(files, symbol)) {
		const contents = await readSource(filePath);

		// Cheap rejection before splitting a whole file into lines.
		if (!contents?.includes(symbol)) continue;

		const found = declarationLine(contents, symbol);

		if (found) {
			const hit: SymbolDefinition = {
				absolutePath: filePath,
				relativePath: path.relative(projectPath, filePath),
				line: found.line,
				kind: found.kind,
			};

			if (found.kind === "export") return hit;
			fallback ??= hit;
		}

		// A file named after the symbol that declares nothing matching is still
		// where the reader meant to go — a default-exported anonymous component,
		// most often. Held as the weakest answer.
		if (!fallback && namedAfter(filePath, symbol)) {
			fallback = {
				absolutePath: filePath,
				relativePath: path.relative(projectPath, filePath),
				line: 1,
				kind: "file",
			};
		}
	}

	return fallback;
}
