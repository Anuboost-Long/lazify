import fs from "node:fs";
import path from "node:path";

import prettier from "prettier";

import type { ProjectFormatter } from "./types";

/**
 * What a project says about how it wants to be formatted.
 *
 * Resolution is Prettier's own rather than a list of filenames kept here: it
 * knows every spelling of its config, the `prettier` key in package.json, and
 * that a config in a parent folder still governs. A list of our own would drift
 * from that the first time it gained a format.
 */

function ignoreFile(projectPath: string): string | undefined {
	const candidate = path.join(projectPath, ".prettierignore");

	return fs.existsSync(candidate) ? candidate : undefined;
}

/**
 * The config governing this project, as a path relative to it, or null when it
 * declares none and the app's own defaults are what will be applied.
 */
export async function readProjectFormatter(projectPath: string): Promise<ProjectFormatter> {
	try {
		// Resolved against a file rather than the folder, because that is what
		// Prettier's own lookup takes.
		const found = await prettier.resolveConfigFile(path.join(projectPath, "package.json"));

		if (!found) return { configFile: null };

		const relative = path.relative(projectPath, found);

		// A config above the project governs it but is not part of it; naming it by
		// its path outside says so rather than pretending it sits in the tree.
		return { configFile: relative.startsWith("..") ? found : relative };
	} catch {
		return { configFile: null };
	}
}

/** Whether this file is one the formatter can read, and is allowed to touch. */
export async function isFormattable(projectPath: string, absolutePath: string): Promise<boolean> {
	try {
		const info = await prettier.getFileInfo(absolutePath, {
			ignorePath: ignoreFile(projectPath),
		});

		return !info.ignored && info.inferredParser !== null;
	} catch {
		return false;
	}
}
