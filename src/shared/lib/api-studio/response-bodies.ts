import { stableDigest } from "@/shared/lib/hash";
import path from "@/shared/lib/path";
import {
	createFolder,
	deletePath,
	fileStat,
	listFolderNames,
	movePath,
	pathExists,
	readTextFile,
	writeTextFile,
} from "@/platform/folders";

/**
 * A response body is a file, not a field.
 *
 * The index says what a route sends and what came back; the bodies sit beside
 * it one file each, so opening a project reads kilobytes rather than every
 * response ever kept, and saving a request rewrites the index alone.
 */

export function bodyFileName(routeId: string, kind: string) {
	return `${stableDigest(routeId).slice(0, 12)}-${kind}.txt`;
}

export async function readBody(directory: string, fileName: string): Promise<string> {
	return (await readTextFile(path.join(directory, fileName))) ?? "";
}

export async function hasBody(directory: string, fileName: string): Promise<boolean> {
	try {
		return (await fileStat(path.join(directory, fileName))).size > 0;
	} catch {
		return false;
	}
}

export async function writeBody(directory: string, fileName: string, body: string): Promise<void> {
	await createFolder(directory);
	await writeTextFile(path.join(directory, fileName), body);
}

/** Whatever this route no longer references is a file nobody can reach. */
export async function pruneBodies(directory: string, routeId: string, keep: Set<string>): Promise<void> {
	const prefix = bodyFileName(routeId, "").split("-")[0];
	const entries = await listFolderNames(directory);

	for (const entry of entries) {
		if (!entry.startsWith(prefix) || keep.has(entry)) continue;

		await deletePath(path.join(directory, entry));
	}
}

export async function moveBodies(from: string, to: string): Promise<void> {
	if (!(await pathExists(from))) return;

	await createFolder(to);

	for (const entry of await listFolderNames(from)) {
		const target = path.join(to, entry);

		if (await pathExists(target)) await deletePath(target);

		await movePath(path.join(from, entry), target);
	}

	await deletePath(from);
}
