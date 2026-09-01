import path from "node:path";

/**
 * How a finding names the file it is about.
 *
 * A file outside the project is named in full: a `../../` path would read as if
 * it were somewhere in the tree. Inside it, separators are always forward
 * slashes — the text goes to an agent and to the reader, who both write paths
 * that way whatever machine the app is running on.
 */
export function projectRelative(projectPath: string, filePath: string): string {
	const relative = path.relative(projectPath, filePath);

	if (!relative || relative.startsWith("..")) return filePath;

	return relative.split(path.sep).join("/");
}
