import fs from "node:fs";
import path from "node:path";

const DIRECTORY_NAME = ".lazify";
const IGNORE_FILE = ".gitignore";
const IGNORE_ENTRY = `${DIRECTORY_NAME}/`;

function insideRepository(projectPath: string): boolean {
	let current = path.resolve(projectPath);

	for (;;) {
		if (fs.existsSync(path.join(current, ".git"))) return true;

		const parent = path.dirname(current);

		if (parent === current) return false;

		current = parent;
	}
}

function listed(content: string): boolean {
	return content
		.split(/\r?\n/)
		.some((line) => line.trim().split("/").filter(Boolean).join("/") === DIRECTORY_NAME);
}

export function ignoreLazifyDirectory(projectPath: string): void {
	try {
		if (!insideRepository(projectPath)) return;

		const ignorePath = path.join(path.resolve(projectPath), IGNORE_FILE);
		const existing = fs.existsSync(ignorePath) ? fs.readFileSync(ignorePath, "utf8") : "";

		if (listed(existing)) return;

		const separator = !existing || existing.endsWith("\n") ? "" : "\n";

		fs.appendFileSync(ignorePath, `${separator}${IGNORE_ENTRY}\n`, "utf8");
	} catch {
		/** A project whose ignore file cannot be written still gets its directory. */
	}
}

export function ensureLazifyDirectory(projectPath: string, directory: string): string {
	fs.mkdirSync(directory, { recursive: true });
	ignoreLazifyDirectory(projectPath);

	return directory;
}
