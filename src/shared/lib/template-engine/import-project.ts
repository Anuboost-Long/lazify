import { fileStat, listFolderTree, readFileBytes } from "@/platform/folders";
import path from "@/shared/lib/path";

import { MAX_TEMPLATE_CONTENT_BYTES, SAFE_TEXT_EXTENSIONS } from "./content-rules";
import { detectFileRole } from "./detect-file-role";
import { detectFolderRole } from "./detect-folder-role";
import {
	DEFAULT_IGNORED_DIRECTORY_NAMES,
	DEFAULT_IGNORED_FILE_NAMES,
	ENVIRONMENT_FILE_NAMES,
} from "./import-rules";
import type { TreeNode } from "./types";

interface IgnoreRule {
	negated: boolean;
	directoryOnly: boolean;
	basenameOnly: boolean;
	matcher: RegExp;
}

export interface ImportProjectResult {
	tree: TreeNode[];
	warnings: string[];
	originalFileCount: number;
}

interface Entry {
	name: string;
	kind: "file" | "folder" | "symlink" | "other";
	size: number;
}

/** Every folder's entries, keyed by its path relative to the project root ("" for the root). */
type Listing = Map<string, Entry[]>;

// Node's `toString("utf8")`: invalid bytes become U+FFFD and a BOM is kept.
const utf8 = new TextDecoder("utf-8", { ignoreBOM: true });

function sortDirectoryEntries(a: string, b: string) {
	return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function escapeRegex(value: string) {
	return value.replace(/[|\\{}()[\]^$+?.]/g, String.raw`\$&`);
}

function globToRegex(pattern: string) {
	let regex = "";

	for (let index = 0; index < pattern.length; index += 1) {
		const current = pattern[index];
		const next = pattern[index + 1];

		if (current === "*") {
			if (next === "*") {
				const nextNext = pattern[index + 2];

				if (nextNext === "/") {
					regex += "(?:.*/)?";
					index += 2;
				} else {
					regex += ".*";
					index += 1;
				}
			} else {
				regex += "[^/]*";
			}

			continue;
		}

		if (current === "?") {
			regex += "[^/]";
			continue;
		}

		regex += escapeRegex(current);
	}

	return regex;
}

function compileIgnoreRule(rawPattern: string, baseRelativePath: string): IgnoreRule | null {
	const trimmedPattern = rawPattern.trim();

	if (!trimmedPattern || trimmedPattern.startsWith("#")) {
		return null;
	}

	const negated = trimmedPattern.startsWith("!");
	let pattern = negated ? trimmedPattern.slice(1) : trimmedPattern;

	if (!pattern) {
		return null;
	}

	const directoryOnly = pattern.endsWith("/");

	if (directoryOnly) {
		pattern = pattern.slice(0, -1);
	}

	const anchored = pattern.startsWith("/");

	if (anchored) {
		pattern = pattern.slice(1);
	}

	if (!pattern) {
		return null;
	}

	const basenameOnly = !pattern.includes("/");
	const scopePrefix = basenameOnly || !baseRelativePath ? "" : `${baseRelativePath}/`;
	const scopedPattern = `${scopePrefix}${pattern}`;

	return {
		negated,
		directoryOnly,
		basenameOnly,
		matcher: new RegExp(`^${globToRegex(scopedPattern)}$`),
	};
}

const childPath = (relativeFolder: string, name: string) => (relativeFolder ? `${relativeFolder}/${name}` : name);

async function readText(filePath: string) {
	return utf8.decode(await readFileBytes(filePath));
}

async function loadIgnoreRules(rootPath: string, relativeFolder: string, listing: Listing) {
	if (!listing.get(relativeFolder)?.some((entry) => entry.name === ".gitignore")) {
		return [];
	}

	try {
		const content = await readText(path.join(rootPath, relativeFolder, ".gitignore"));
		return content
			.split(/\r?\n/)
			.map((line) => compileIgnoreRule(line, relativeFolder))
			.filter((rule): rule is IgnoreRule => rule !== null);
	} catch {
		return [];
	}
}

function shouldIgnore(
	relativePath: string,
	entryName: string,
	isDirectory: boolean,
	rules: IgnoreRule[],
) {
	let ignored = false;

	for (const rule of rules) {
		if (rule.directoryOnly && !isDirectory) {
			continue;
		}

		const target = rule.basenameOnly ? entryName : relativePath;

		if (!rule.matcher.test(target)) {
			continue;
		}

		ignored = !rule.negated;
	}

	return ignored;
}

function isLikelyBinary(bytes: Uint8Array) {
	const sampleSize = Math.min(bytes.length, 8000);

	for (let index = 0; index < sampleSize; index += 1) {
		if (bytes[index] === 0) {
			return true;
		}
	}

	return false;
}

async function readTemplateFileContent(filePath: string, size: number) {
	const extension = path.extname(filePath).toLowerCase();

	if (size > MAX_TEMPLATE_CONTENT_BYTES) {
		return {
			includeContent: false,
			content: undefined,
			isBinary: false,
		};
	}

	const bytes = await readFileBytes(filePath);

	if (isLikelyBinary(bytes) || !SAFE_TEXT_EXTENSIONS.has(extension)) {
		return {
			includeContent: false,
			content: undefined,
			isBinary: true,
		};
	}

	return {
		includeContent: true,
		content: utf8.decode(bytes),
		isBinary: false,
	};
}

/** Git internals, the default ignores, and whatever .gitignore rules out. */
function isExcludedEntry(
	entry: Entry,
	relativePath: string,
	activeRules: IgnoreRule[],
	warnings: Set<string>,
): boolean {
	if (entry.name === ".git") {
		return true;
	}

	if (entry.kind === "folder" && DEFAULT_IGNORED_DIRECTORY_NAMES.has(entry.name)) {
		return true;
	}

	if (entry.kind === "file" && DEFAULT_IGNORED_FILE_NAMES.has(entry.name)) {
		if (ENVIRONMENT_FILE_NAMES.has(entry.name)) {
			warnings.add("Environment files were excluded for safety.");
		}
		return true;
	}

	return shouldIgnore(relativePath, entry.name, entry.kind === "folder", activeRules);
}

async function scanDirectoryNode(input: {
	rootPath: string;
	relativeFolder: string;
	listing: Listing;
	selectedRelativePaths?: Set<string>;
	inheritedRules?: IgnoreRule[];
	warnings: Set<string>;
}): Promise<TreeNode[]> {
	const localRules = await loadIgnoreRules(input.rootPath, input.relativeFolder, input.listing);
	const activeRules = [...(input.inheritedRules ?? []), ...localRules];
	const visibleEntries = (input.listing.get(input.relativeFolder) ?? [])
		.filter((entry) => {
			const relativePath = childPath(input.relativeFolder, entry.name);

			if (isExcludedEntry(entry, relativePath, activeRules, input.warnings)) {
				return false;
			}

			if (!input.selectedRelativePaths) {
				return true;
			}

			if (entry.kind === "folder") {
				return Array.from(input.selectedRelativePaths).some(
					(selectedPath) => selectedPath === relativePath || selectedPath.startsWith(`${relativePath}/`),
				);
			}

			return input.selectedRelativePaths.has(relativePath);
		})
		.sort((left, right) => {
			if ((left.kind === "folder") !== (right.kind === "folder")) {
				return left.kind === "folder" ? -1 : 1;
			}

			return sortDirectoryEntries(left.name, right.name);
		});

	const nodes = await Promise.all(
		visibleEntries.map(async (entry) => {
			const relativePath = childPath(input.relativeFolder, entry.name);

			if (entry.kind === "folder") {
				const children = await scanDirectoryNode({
					...input,
					relativeFolder: relativePath,
					inheritedRules: activeRules,
				});

				if (children.length === 0 && input.selectedRelativePaths) {
					return null;
				}

				return {
					id: `tree-${relativePath || entry.name}`,
					name: entry.name,
					path: relativePath,
					type: "folder" as const,
					role: detectFolderRole(relativePath),
					locked: false,
					source: "imported" as const,
					children,
				};
			}

			if (entry.kind !== "file") {
				return null;
			}

			const contentResult = await readTemplateFileContent(path.join(input.rootPath, relativePath), entry.size);

			if (!contentResult.includeContent && entry.size > MAX_TEMPLATE_CONTENT_BYTES) {
				input.warnings.add("Some large files were skipped from content storage.");
			}

			if (contentResult.isBinary) {
				input.warnings.add("Binary files were stored as references only.");
			}

			return {
				id: `tree-${relativePath || entry.name}`,
				name: entry.name,
				path: relativePath,
				type: "file" as const,
				extension: path.extname(entry.name).toLowerCase(),
				size: entry.size,
				role: detectFileRole(relativePath),
				includeContent: contentResult.includeContent,
				content: contentResult.content,
				isBinary: contentResult.isBinary,
				locked: false,
				source: "imported" as const,
			};
		}),
	);

	return nodes.filter((node): node is NonNullable<typeof node> => node !== null);
}

async function countVisibleFiles(input: {
	rootPath: string;
	relativeFolder: string;
	listing: Listing;
	inheritedRules?: IgnoreRule[];
	warnings: Set<string>;
}): Promise<number> {
	const localRules = await loadIgnoreRules(input.rootPath, input.relativeFolder, input.listing);
	const activeRules = [...(input.inheritedRules ?? []), ...localRules];
	let count = 0;

	for (const entry of input.listing.get(input.relativeFolder) ?? []) {
		const relativePath = childPath(input.relativeFolder, entry.name);

		if (isExcludedEntry(entry, relativePath, activeRules, input.warnings)) {
			continue;
		}

		if (entry.kind === "folder") {
			count += await countVisibleFiles({
				...input,
				relativeFolder: relativePath,
				inheritedRules: activeRules,
			});
			continue;
		}

		if (entry.kind === "file") {
			count += 1;
		}
	}

	return count;
}

/** One recursive listing in place of a `readdir` per folder; the ignored folders are never entered. */
async function listProject(rootPath: string): Promise<Listing> {
	const listing: Listing = new Map([["", []]]);

	for (const entry of await listFolderTree(rootPath, [...DEFAULT_IGNORED_DIRECTORY_NAMES])) {
		const relativePath = entry.path.slice(rootPath.length + 1);
		const separator = relativePath.lastIndexOf("/");
		const folder = separator === -1 ? "" : relativePath.slice(0, separator);
		const name = relativePath.slice(separator + 1);

		if (entry.kind === "folder") listing.set(relativePath, listing.get(relativePath) ?? []);

		const siblings = listing.get(folder) ?? [];
		siblings.push({ name, kind: entry.kind, size: entry.size });
		listing.set(folder, siblings);
	}

	return listing;
}

export async function importProject(projectRoot: string): Promise<TreeNode[]> {
	const result = await importProjectWithMetadata(projectRoot);
	return result.tree;
}

export async function importProjectWithMetadata(
	projectRoot: string,
	selectedRelativePaths?: string[],
): Promise<ImportProjectResult> {
	const resolvedProjectPath = path.resolve(projectRoot);
	const stats = await fileStat(resolvedProjectPath);

	if (stats.kind !== "folder") {
		throw new Error("The selected path is not a directory.");
	}

	const warnings = new Set<string>();
	const listing = await listProject(resolvedProjectPath);
	const selectedSet = selectedRelativePaths
		? new Set(selectedRelativePaths.map((entry) => path.normalize(entry)))
		: undefined;
	const originalFileCount = await countVisibleFiles({
		rootPath: resolvedProjectPath,
		relativeFolder: "",
		listing,
		warnings,
	});
	const tree = await scanDirectoryNode({
		rootPath: resolvedProjectPath,
		relativeFolder: "",
		listing,
		selectedRelativePaths: selectedSet,
		warnings,
	});

	return {
		tree,
		warnings: [...warnings],
		originalFileCount,
	};
}
