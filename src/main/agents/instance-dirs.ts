import fs from "node:fs";
import path from "node:path";

function isRunning(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

export function pruneInstanceDirs(root: string, pidOf: (name: string) => number): void {
	let entries: string[] = [];

	try {
		entries = fs.readdirSync(root);
	} catch {
		return;
	}

	for (const entry of entries) {
		const owner = pidOf(entry);

		if (owner > 1 && Number.isInteger(owner) && owner !== process.pid && isRunning(owner)) continue;

		try {
			fs.rmSync(path.join(root, entry), { recursive: true, force: true });
		} catch {
			// Storage we failed to reclaim is reclaimed on the next launch instead.
		}
	}
}
