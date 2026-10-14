import { listFolder } from "@/platform/folders";

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

async function firstSourceFile(directory: string, depth: number): Promise<string | null> {
	let entries: Awaited<ReturnType<typeof listFolder>>;

	try {
		entries = await listFolder(directory);
	} catch {
		return null;
	}

	const file = entries.find((entry) => entry.kind === "file" && isLintablePath(entry.name));

	if (file) return file.path;

	if (depth === MAX_DEPTH) return null;

	for (const entry of entries) {
		if (entry.kind !== "folder" || SKIP.has(entry.name) || entry.name.startsWith(".")) continue;

		const found = await firstSourceFile(entry.path, depth + 1);

		if (found) return found;
	}

	return null;
}

const warmed = new Set<string>();

export async function warmLintEngines(projectPath: string): Promise<void> {
	if (!projectPath || warmed.has(projectPath)) return;

	warmed.add(projectPath);

	const file = await firstSourceFile(projectPath, 0);

	if (!file) return;

	try {
		await lintPaths([file]);
	} catch {
		warmed.delete(projectPath);
	}
}
