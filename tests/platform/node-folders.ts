import fs from "node:fs/promises";
import path from "node:path";

import type { FolderEntry, FolderEntryKind } from "@chain/sdk";

const chainError = (code: string, message: string) => Object.assign(new Error(message), { code });

async function chainCall<T>(target: string, call: () => Promise<T>): Promise<T> {
	try {
		return await call();
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code;
		if (code === "ENOENT") throw chainError("NOT_FOUND", `${target} does not exist`);
		if (code === "EISDIR" || code === "ENOTDIR") throw chainError("INVALID_ARGUMENT", `${target}: ${code}`);
		throw error;
	}
}

const kindOf = (stats: { isFile(): boolean; isDirectory(): boolean; isSymbolicLink(): boolean }): FolderEntryKind => {
	if (stats.isSymbolicLink()) return "symlink";
	if (stats.isDirectory()) return "folder";

	return stats.isFile() ? "file" : "other";
};

async function entryOf(target: string): Promise<FolderEntry> {
	const stats = await fs.lstat(target);
	const kind = kindOf(stats);

	return {
		path: target,
		name: path.basename(target),
		kind,
		size: kind === "folder" ? 0 : stats.size,
		modifiedMs: stats.mtimeMs,
	};
}

export const nodeFolders = {
	exists: (target: string) => fs.lstat(target).then(() => true, () => false),
	stat: (target: string) => chainCall(target, () => entryOf(target)),
	list: (target: string, options: { recursive?: boolean; skipFolders?: string[] } = {}) =>
		chainCall(target, async () => {
			const skipped = new Set(options.skipFolders ?? []);
			const listFolder = async (folder: string): Promise<FolderEntry[]> => {
				const names = await fs.readdir(folder);
				const entries = await Promise.all(names.map((name) => entryOf(path.join(folder, name))));
				if (!options.recursive) return entries;

				const nested: FolderEntry[] = [];
				for (const entry of entries) {
					nested.push(entry);
					if (entry.kind === "folder" && !skipped.has(entry.name)) {
						nested.push(...(await listFolder(entry.path)));
					}
				}
				return nested;
			};

			return listFolder(target);
		}),
	readText: (target: string, options: { maxBytes?: number } = {}) =>
		chainCall(target, async () => {
			const bytes = await fs.readFile(target);
			if (options.maxBytes !== undefined && bytes.length > options.maxBytes) {
				throw chainError("TOO_LARGE", `${target} is larger than ${options.maxBytes} bytes`);
			}
			return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
		}),
	readBytes: (target: string) => chainCall(target, async () => new Uint8Array(await fs.readFile(target))),
	writeText: (target: string, text: string) => chainCall(target, () => fs.writeFile(target, text)),
	writeBytes: (target: string, bytes: Uint8Array) => chainCall(target, () => fs.writeFile(target, bytes)),
	createFolder: async (target: string) => {
		await fs.mkdir(target, { recursive: true });
	},
	appFolder: async (kind: "data" | "temp") => ({
		id: `app:${kind}`,
		path: appFolders[kind],
		kind: "folder" as const,
		access: "readWrite" as const,
		source: "app" as const,
	}),
};

export const appFolders = { data: "/nonexistent-app-data", temp: "/nonexistent-app-temp" };
