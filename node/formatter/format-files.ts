import fs from "node:fs";
import path from "node:path";

import prettier from "prettier";

import type { FormatFailure, FormatOutcome, FormatterDefaults } from "../../src/shared/lib/formatting/types";
import type { FormatRequest } from "../../src/shared/lib/formatting/worker-protocol";
import { readAliasPrefixes } from "./import-aliases";
import { organizeImports } from "./organize-imports";
import { isFormattable, readProjectFormatter } from "./project-formatter";

/**
 * Formats the files it is given and nothing else.
 *
 * The app passes the list from `getWorkingChanges`, which is the same answer the
 * changes panel shows — every file that differs from HEAD, including untracked
 * ones, and for a folder git knows nothing about, from the shadow repo it keeps.
 * So "what gets formatted" and "what the user is looking at" cannot disagree.
 *
 * A file is only written when formatting actually changed it. Rewriting a file
 * with its own contents would move its mtime, which is enough to make watchers
 * rebuild and git think something happened.
 */

/** Past this, formatting would block the main process long enough to be felt. */
const MAX_FILE_BYTES = 2_000_000;

/** Keeps a path that came in over IPC from addressing anything outside the project. */
function insideProject(projectPath: string, relativePath: string): string | null {
	const root = path.resolve(projectPath);
	const resolved = path.resolve(root, relativePath);

	return resolved === root || resolved.startsWith(root + path.sep) ? resolved : null;
}

async function formatOne(
	projectPath: string,
	relativePath: string,
	fallback: FormatterDefaults,
	write: boolean,
	aliasPrefixes: string[] | null,
): Promise<"formatted" | "unchanged" | FormatFailure> {
	const absolutePath = insideProject(projectPath, relativePath);

	if (!absolutePath) {
		return { path: relativePath, message: "Outside the project" };
	}

	let stat: fs.Stats;

	try {
		stat = fs.statSync(absolutePath);
	} catch {
		// Deleted in the same session that changed it. Nothing to format.
		return "unchanged";
	}

	if (!stat.isFile() || stat.size > MAX_FILE_BYTES) return "unchanged";
	if (!(await isFormattable(projectPath, absolutePath))) return "unchanged";

	try {
		const source = fs.readFileSync(absolutePath, "utf8");

		// The project's own config wins wherever it speaks. Only where it says
		// nothing at all do the app's defaults apply.
		const projectOptions = await prettier.resolveConfig(absolutePath);
		const sorted = aliasPrefixes ? organizeImports(source, absolutePath, aliasPrefixes) : source;

		const formatted = await prettier.format(sorted, {
			...(projectOptions ?? fallback),
			filepath: absolutePath,
		});

		if (formatted === source) return "unchanged";

		if (write) fs.writeFileSync(absolutePath, formatted, "utf8");

		return "formatted";
	} catch (error) {
		return {
			path: relativePath,
			message: error instanceof Error ? error.message.split("\n")[0] : "Could not format",
		};
	}
}

/**
 * @param request.mode "preview" answers what would change without writing any
 * of it. Deliberately the same call rather than a second one: a confirmation
 * that was produced by different code than the run it confirms is worth nothing.
 */
export async function formatFiles({
	projectPath,
	paths,
	mode,
	organizeImports: organize,
	defaults,
}: FormatRequest): Promise<FormatOutcome> {
	const { configFile } = await readProjectFormatter(projectPath);
	const aliasPrefixes = organize ? readAliasPrefixes(projectPath) : null;

	const outcome: FormatOutcome = {
		formatted: [],
		unchanged: [],
		failed: [],
		configFile,
	};

	// One at a time: a session's changes are tens of files, and formatting them
	// in parallel only trades a wait nobody notices for a spike that stutters the
	// window this runs in.
	for (const relativePath of paths) {
		const result = await formatOne(
			projectPath,
			relativePath,
			defaults,
			mode === "write",
			aliasPrefixes,
		);

		if (result === "formatted") outcome.formatted.push(relativePath);
		else if (result === "unchanged") outcome.unchanged.push(relativePath);
		else outcome.failed.push(result);
	}

	return outcome;
}
