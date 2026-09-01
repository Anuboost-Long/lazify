import fs from "node:fs/promises";

import { lintFile } from "./lint-file";
import type { LintResult } from "./types";

/**
 * Findings for files named by something outside the editor.
 *
 * The editor asks about the buffer in front of the reader; an agent asks about
 * files it has just written, which it knows only by path. So content is read
 * back off disk here, and a path that cannot be read is dropped rather than
 * reported — an agent that deleted or moved a file should not be handed an
 * error about it.
 */

/** More than an agent changes in one step; past this the answer is not read. */
const MAX_PATHS = 20;

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
	".html",
	".css",
]);

export const isLintablePath = (filePath: string) =>
	SOURCE_EXTENSIONS.has(filePath.slice(filePath.lastIndexOf(".")).toLowerCase());

export async function lintPaths(paths: string[]): Promise<LintResult[]> {
	const wanted = [...new Set(paths)].filter(isLintablePath).slice(0, MAX_PATHS);

	const settled = await Promise.all(
		wanted.map(async (filePath) => {
			try {
				return await lintFile(filePath, await fs.readFile(filePath, "utf8"));
			} catch {
				return null;
			}
		}),
	);

	return settled.filter((result): result is LintResult => result !== null);
}
