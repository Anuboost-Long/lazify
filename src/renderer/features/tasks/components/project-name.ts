/**
 * The folder a project path ends in — the name a task is filed under.
 *
 * Walked from the end rather than filtered, so a trailing slash costs nothing
 * and the whole path is never rebuilt just to read its last part.
 */
export function projectFolderName(projectPath: string): string {
	const segments = projectPath.split("/");

	for (let index = segments.length - 1; index >= 0; index -= 1) {
		if (segments[index]) return segments[index];
	}

	return "";
}
