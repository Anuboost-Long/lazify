import fs from "node:fs/promises";
import path from "node:path";

import {
	IGNORED_DIRECTORY_NAMES,
	isEnvFile,
	loadIgnoreRules,
	shouldIgnore,
	type IgnoreRule,
} from "../project-importer-optimized";
import type { PathFilters } from "./path-globs";

const MAX_SCANNED_FILES = 20_000;

export interface SearchableFile {
	absolutePath: string;
	relativePath: string;
}

export interface SearchableFiles {
	files: SearchableFile[];
	truncated: boolean;
}

interface WalkOptions {
	projectPath: string;
	filters: PathFilters;
	useIgnoreFiles: boolean;
}

function toRelativePath(projectPath: string, entryPath: string) {
	return path.relative(projectPath, entryPath).split(path.sep).join("/");
}

export async function collectSearchableFiles({
	projectPath,
	filters,
	useIgnoreFiles,
}: WalkOptions): Promise<SearchableFiles> {
	const files: SearchableFile[] = [];
	let truncated = false;

	const visit = async (currentPath: string, inheritedRules: IgnoreRule[]) => {
		if (files.length >= MAX_SCANNED_FILES) {
			truncated = true;
			return;
		}

		const rules = useIgnoreFiles
			? [
					...inheritedRules,
					...(await loadIgnoreRules(currentPath, toRelativePath(projectPath, currentPath))),
				]
			: inheritedRules;

		let entries;

		try {
			entries = await fs.readdir(currentPath, { withFileTypes: true });
		} catch {
			return;
		}

		for (const entry of entries) {
			if (files.length >= MAX_SCANNED_FILES) {
				truncated = true;
				return;
			}

			if (entry.isSymbolicLink() || entry.name === ".git") continue;

			const entryPath = path.join(currentPath, entry.name);
			const relativePath = toRelativePath(projectPath, entryPath);

			if (filters.matchesExclude(relativePath)) continue;

			if (entry.isDirectory()) {
				if (IGNORED_DIRECTORY_NAMES.has(entry.name)) continue;
				if (shouldIgnore(relativePath, entry.name, true, rules)) continue;

				await visit(entryPath, rules);
				continue;
			}

			if (!entry.isFile()) continue;
			if (!isEnvFile(entry.name, false) && shouldIgnore(relativePath, entry.name, false, rules)) {
				continue;
			}
			if (!filters.matchesInclude(relativePath)) continue;

			files.push({ absolutePath: entryPath, relativePath });
		}
	};

	await visit(projectPath, []);

	return { files, truncated };
}
