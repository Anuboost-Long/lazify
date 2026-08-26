import fs from "node:fs";
import path from "node:path";

const MARKERS = ["package.json", ".git", "deno.json", "bun.lockb"];

export function projectRootFor(filePath: string): string | null {
	let current = path.dirname(filePath);

	for (;;) {
		if (MARKERS.some((marker) => fs.existsSync(path.join(current, marker)))) return current;

		const parent = path.dirname(current);

		if (parent === current) return null;

		current = parent;
	}
}
