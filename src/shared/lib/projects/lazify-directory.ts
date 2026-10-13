import { existingPaths } from "@/platform/exec";
import { createFolder, readTextFile, writeTextFile } from "@/platform/folders";
import path from "@/shared/lib/path";

const DIRECTORY_NAME = ".lazify";
const IGNORE_FILE = ".gitignore";
const IGNORE_ENTRY = `${DIRECTORY_NAME}/`;

/** Every folder from the project up to the root, checked for `.git` at once. */
async function insideRepository(projectPath: string): Promise<boolean> {
	const candidates: string[] = [];
	let current = path.resolve(projectPath);

	for (;;) {
		candidates.push(path.join(current, ".git"));

		const parent = path.dirname(current);

		if (parent === current) break;

		current = parent;
	}

	return (await existingPaths(candidates)).size > 0;
}

function listed(content: string): boolean {
	return content
		.split(/\r?\n/)
		.some((line) => line.trim().split("/").filter(Boolean).join("/") === DIRECTORY_NAME);
}

export async function ignoreLazifyDirectory(projectPath: string): Promise<void> {
	try {
		if (!(await insideRepository(projectPath))) return;

		const ignorePath = path.join(path.resolve(projectPath), IGNORE_FILE);
		const existing = (await readTextFile(ignorePath)) ?? "";

		if (listed(existing)) return;

		const separator = !existing || existing.endsWith("\n") ? "" : "\n";

		await writeTextFile(ignorePath, `${existing}${separator}${IGNORE_ENTRY}\n`);
	} catch {
		/** A project whose ignore file cannot be written still gets its directory. */
	}
}

export async function ensureLazifyDirectory(projectPath: string, directory: string): Promise<string> {
	await createFolder(directory);
	await ignoreLazifyDirectory(projectPath);

	return directory;
}
