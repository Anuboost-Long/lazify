import fs from "node:fs/promises";
import path from "node:path";

import { detectProjectStack } from "../../brain";
import type {
	ImportedProjectIndexNode,
	ImportedProjectIndexResult,
	ProjectTreeNode,
} from "../../renderer/shared/types/lazify";

export const IGNORED_DIRECTORY_NAMES = new Set([
	".git",
	"node_modules",
	"dist",
	"build",
	".next",
	".expo",
	".turbo",
	"coverage",
	// .NET build output
	"bin",
	"obj",
	".vs",
	"TestResults",
]);
const MAX_PREVIEW_BYTES = 256 * 1024;

export interface IgnoreRule {
	negated: boolean;
	directoryOnly: boolean;
	basenameOnly: boolean;
	matcher: RegExp;
}

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
	const scoped = !basenameOnly && Boolean(baseRelativePath);
	const scopedPattern = scoped ? `${baseRelativePath}/${pattern}` : pattern;
	const regexSource = `^${globToRegex(scopedPattern)}$`;

	return {
		negated,
		directoryOnly,
		basenameOnly,
		matcher: new RegExp(regexSource),
	};
}

export async function loadIgnoreRules(currentPath: string, baseRelativePath: string) {
	const gitignorePath = path.join(currentPath, ".gitignore");

	try {
		const content = await fs.readFile(gitignorePath, "utf8");

		return content
			.split(/\r?\n/)
			.map((line) => compileIgnoreRule(line, baseRelativePath))
			.filter((rule): rule is IgnoreRule => rule !== null);
	} catch {
		return [];
	}
}

export function shouldIgnore(
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

/**
 * Env files are gitignored by design, but they are exactly what you open the
 * explorer to check, so the tree lists them anyway. Only the explorer index
 * makes this exception — template exports keep honouring .gitignore.
 */
export function isEnvFile(entryName: string, isDirectory: boolean) {
	return !isDirectory && (entryName === ".env" || entryName.startsWith(".env."));
}

function createNode(
	rootPath: string,
	absolutePath: string,
	name: string,
	type: "file" | "folder",
	children: ImportedProjectIndexNode[] = [],
): ImportedProjectIndexNode {
	const relativePath = path.relative(rootPath, absolutePath).split(path.sep).join("/");

	return {
		id: `imported-index-${relativePath || name}`,
		name,
		type,
		relativePath,
		absolutePath,
		children,
	};
}

function getPreviewPlaceholder(message: string) {
	return `${message}\n`;
}

function isLikelyBinary(buffer: Buffer) {
	const sampleSize = Math.min(buffer.length, 8000);

	for (let index = 0; index < sampleSize; index += 1) {
		if (buffer[index] === 0) {
			return true;
		}
	}

	return false;
}

async function readFilePreview(filePath: string) {
	const stats = await fs.stat(filePath);

	if (stats.size > MAX_PREVIEW_BYTES) {
		return getPreviewPlaceholder(
			`Preview omitted. File is larger than ${Math.round(MAX_PREVIEW_BYTES / 1024)} KB.`,
		);
	}

	const buffer = await fs.readFile(filePath);

	if (isLikelyBinary(buffer)) {
		return getPreviewPlaceholder("Preview unavailable for binary file.");
	}

	return buffer.toString("utf8");
}

function normalizeRelativePath(value: string) {
	return value.split(path.sep).join("/");
}

function createTemplateNode(
	relativePath: string,
	name: string,
	type: "file" | "folder",
	children: ProjectTreeNode[] = [],
	content?: string,
): ProjectTreeNode {
	return {
		id: `imported-template-${relativePath || name}`,
		name,
		type,
		source: "custom",
		locked: false,
		content,
		children,
	};
}

async function scanDirectoryNode(
	rootPath: string,
	currentPath: string,
	inheritedRules: IgnoreRule[] = [],
): Promise<ImportedProjectIndexNode[]> {
	const baseRelativePath = path.relative(rootPath, currentPath).split(path.sep).join("/");
	const localRules = await loadIgnoreRules(currentPath, baseRelativePath);
	const activeRules = [...inheritedRules, ...localRules];
	const directoryEntries = await fs.readdir(currentPath, {
		withFileTypes: true,
	});
	const visibleEntries = directoryEntries
		.filter((entry) => {
			if (entry.name === ".git") {
				return false;
			}

			if (entry.isDirectory()) {
				if (IGNORED_DIRECTORY_NAMES.has(entry.name)) {
					return false;
				}
			}

			if (isEnvFile(entry.name, entry.isDirectory())) {
				return true;
			}

			const entryPath = path.join(currentPath, entry.name);
			const relativePath = path.relative(rootPath, entryPath).split(path.sep).join("/");

			return !shouldIgnore(relativePath, entry.name, entry.isDirectory(), activeRules);
		})
		.sort((left, right) => {
			if (left.isDirectory() !== right.isDirectory()) {
				return left.isDirectory() ? -1 : 1;
			}

			return sortDirectoryEntries(left.name, right.name);
		});

	const nodes = await Promise.all(
		visibleEntries.map(async (entry) => {
			const entryPath = path.join(currentPath, entry.name);

			if (entry.isDirectory()) {
				const children = await scanDirectoryNode(rootPath, entryPath, activeRules);
				return createNode(rootPath, entryPath, entry.name, "folder", children);
			}

			if (!entry.isFile()) {
				return null;
			}

			return createNode(rootPath, entryPath, entry.name, "file");
		}),
	);

	return nodes.filter((node): node is ImportedProjectIndexNode => node !== null);
}

export async function importProjectIndexFromDirectory(
	projectPath: string,
): Promise<ImportedProjectIndexResult> {
	const resolvedProjectPath = path.resolve(projectPath);
	const stats = await fs.stat(resolvedProjectPath);

	if (!stats.isDirectory()) {
		throw new Error("The selected path is not a directory.");
	}

	return {
		projectName: path.basename(resolvedProjectPath),
		projectPath: resolvedProjectPath,
		stackDetection: await detectProjectStack(resolvedProjectPath),
		tree: await scanDirectoryNode(resolvedProjectPath, resolvedProjectPath),
	};
}

export async function readImportedProjectFile(filePath: string) {
	const resolvedFilePath = path.resolve(filePath);
	const stats = await fs.stat(resolvedFilePath);

	if (!stats.isFile()) {
		throw new Error("The selected path is not a file.");
	}

	return readFilePreview(resolvedFilePath);
}

async function buildImportedTemplateTree(
	rootPath: string,
	currentPath: string,
	selectedRelativePaths: Set<string>,
	inheritedRules: IgnoreRule[] = [],
): Promise<ProjectTreeNode[]> {
	const baseRelativePath = path.relative(rootPath, currentPath).split(path.sep).join("/");
	const localRules = await loadIgnoreRules(currentPath, baseRelativePath);
	const activeRules = [...inheritedRules, ...localRules];
	const directoryEntries = await fs.readdir(currentPath, {
		withFileTypes: true,
	});
	const visibleEntries = directoryEntries
		.filter((entry) => {
			if (entry.name === ".git") {
				return false;
			}

			if (entry.isDirectory() && IGNORED_DIRECTORY_NAMES.has(entry.name)) {
				return false;
			}

			const entryPath = path.join(currentPath, entry.name);
			const relativePath = path.relative(rootPath, entryPath).split(path.sep).join("/");

			return !shouldIgnore(relativePath, entry.name, entry.isDirectory(), activeRules);
		})
		.sort((left, right) => {
			if (left.isDirectory() !== right.isDirectory()) {
				return left.isDirectory() ? -1 : 1;
			}

			return sortDirectoryEntries(left.name, right.name);
		});

	const nodes = await Promise.all(
		visibleEntries.map(async (entry) => {
			const entryPath = path.join(currentPath, entry.name);
			const relativePath = normalizeRelativePath(path.relative(rootPath, entryPath));

			if (entry.isDirectory()) {
				const children = await buildImportedTemplateTree(
					rootPath,
					entryPath,
					selectedRelativePaths,
					activeRules,
				);

				if (children.length === 0) {
					return null;
				}

				return createTemplateNode(relativePath, entry.name, "folder", children);
			}

			if (!entry.isFile() || !selectedRelativePaths.has(relativePath)) {
				return null;
			}

			const content = await readFilePreview(entryPath);
			return createTemplateNode(relativePath, entry.name, "file", [], content);
		}),
	);

	return nodes.filter((node): node is ProjectTreeNode => node !== null);
}

export async function createImportedProjectTemplate(
	projectPath: string,
	includedRelativePaths: string[],
): Promise<ProjectTreeNode[]> {
	const resolvedProjectPath = path.resolve(projectPath);
	const stats = await fs.stat(resolvedProjectPath);

	if (!stats.isDirectory()) {
		throw new Error("The selected path is not a directory.");
	}

	const selectedRelativePaths = new Set(
		includedRelativePaths.map((entry) => normalizeRelativePath(path.normalize(entry))),
	);

	if (selectedRelativePaths.size === 0) {
		throw new Error("Select at least one file before saving a template.");
	}

	return buildImportedTemplateTree(resolvedProjectPath, resolvedProjectPath, selectedRelativePaths);
}
