import fs from "node:fs";
import path from "node:path";

import { isLintablePath, lintPaths } from "./lint-paths";

/**
 * Starting the language servers before anyone is waiting on them.
 *
 * A project's first analysis is also the language server's launch, which for
 * SonarLint is tens of seconds. Nothing about that wait is avoidable, but it can
 * be moved: run it when an agent opens, so it has passed by the time the agent
 * has written anything.
 *
 * Any source file will do — the servers index the project, not the file.
 */

const SKIP = new Set(["node_modules", ".git", "dist", "build", "release", "out", ".next"]);

/** Deep enough to reach `src/x/y.ts`, shallow enough to answer at once. */
const MAX_DEPTH = 3;

function firstSourceFile(directory: string, depth: number): string | null {
	let entries: fs.Dirent[];

	try {
		entries = fs.readdirSync(directory, { withFileTypes: true });
	} catch {
		return null;
	}

	const files = entries.filter((entry) => entry.isFile());

	for (const file of files) {
		if (isLintablePath(file.name)) return path.join(directory, file.name);
	}

	if (depth === MAX_DEPTH) return null;

	for (const entry of entries) {
		if (!entry.isDirectory() || SKIP.has(entry.name) || entry.name.startsWith(".")) continue;

		const found = firstSourceFile(path.join(directory, entry.name), depth + 1);

		if (found) return found;
	}

	return null;
}

const warmed = new Set<string>();

export async function warmLintEngines(projectPath: string): Promise<void> {
	if (!projectPath || warmed.has(projectPath)) return;

	warmed.add(projectPath);

	const file = firstSourceFile(projectPath, 0);

	if (!file) return;

	try {
		await lintPaths([file]);
	} catch {
		warmed.delete(projectPath);
	}
}
