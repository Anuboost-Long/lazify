import { existingPaths } from "@/platform/exec";
import path from "@/shared/lib/path";

const MARKERS = ["package.json", ".git", "deno.json", "bun.lockb"];

/** Every folder from the file's up to the root, checked for a marker at once. */
export async function projectRootFor(filePath: string): Promise<string | null> {
	const folders: string[] = [];
	let current = path.dirname(filePath);

	for (;;) {
		folders.push(current);

		const parent = path.dirname(current);

		if (parent === current) break;

		current = parent;
	}

	const found = await existingPaths(folders.flatMap((folder) => MARKERS.map((marker) => path.join(folder, marker))));

	return folders.find((folder) => MARKERS.some((marker) => found.has(path.join(folder, marker)))) ?? null;
}
