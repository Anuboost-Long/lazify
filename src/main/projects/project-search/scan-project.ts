import fs from "node:fs/promises";
import path from "node:path";

import { collectSearchableFiles } from "./file-walk";
import { matchLines } from "./line-matcher";
import { compilePathFilters } from "./path-globs";
import { buildSearchPattern } from "./search-pattern";
import type { ProjectSearchFile, ProjectSearchQuery, ProjectSearchResult } from "./types";

const MAX_FILE_BYTES = 1024 * 1024;
const MAX_MATCHES_PER_FILE = 100;
const MAX_TOTAL_MATCHES = 2000;
const MAX_RESULT_FILES = 500;
const READ_BATCH_SIZE = 24;
const NULL_CHARACTER = "\u0000";

function emptyResult(error: string | null): ProjectSearchResult {
	return { files: [], fileCount: 0, matchCount: 0, truncated: false, error };
}

async function readTextFile(filePath: string): Promise<string | null> {
	try {
		const stats = await fs.stat(filePath);
		if (stats.size > MAX_FILE_BYTES) return null;

		const contents = await fs.readFile(filePath, "utf8");

		return contents.includes(NULL_CHARACTER) ? null : contents;
	} catch {
		return null;
	}
}

export async function searchProject(
	projectPath: string,
	query: ProjectSearchQuery,
): Promise<ProjectSearchResult> {
	if (!projectPath || query.query.length === 0) return emptyResult(null);

	let pattern: RegExp;

	try {
		pattern = buildSearchPattern(query);
	} catch (error) {
		return emptyResult(error instanceof Error ? error.message : "Invalid search pattern.");
	}

	const scanned = await collectSearchableFiles({
		projectPath: path.resolve(projectPath),
		filters: compilePathFilters(query.include, query.exclude),
		useIgnoreFiles: query.useIgnoreFiles,
	});

	const files: ProjectSearchFile[] = [];
	let matchCount = 0;
	let truncated = scanned.truncated;

	for (let index = 0; index < scanned.files.length; index += READ_BATCH_SIZE) {
		if (matchCount >= MAX_TOTAL_MATCHES || files.length >= MAX_RESULT_FILES) {
			truncated = true;
			break;
		}

		const batch = scanned.files.slice(index, index + READ_BATCH_SIZE);
		const contents = await Promise.all(batch.map((entry) => readTextFile(entry.absolutePath)));

		for (const [offset, text] of contents.entries()) {
			if (text === null) continue;

			if (matchCount >= MAX_TOTAL_MATCHES || files.length >= MAX_RESULT_FILES) {
				truncated = true;
				break;
			}

			const budget = Math.min(MAX_MATCHES_PER_FILE, MAX_TOTAL_MATCHES - matchCount);
			const matches = matchLines(text, pattern, budget);
			if (matches.length === 0) continue;

			const { absolutePath, relativePath } = batch[offset];
			const directory = path.posix.dirname(relativePath);

			matchCount += matches.length;
			files.push({
				absolutePath,
				relativePath,
				name: path.posix.basename(relativePath),
				directory: directory === "." ? "" : directory,
				matches,
			});
		}
	}

	return { files, fileCount: files.length, matchCount, truncated, error: null };
}
