import { desktop } from "@chain/sdk";
import type { ChainError } from "@chain/sdk";

import type { ProjectReader } from "@/shared/lib/stack-detection/project-reader";

const isNotFound = (error: unknown) => (error as Partial<ChainError> | null)?.code === "NOT_FOUND";

export function projectReader(root: string): ProjectReader {
	const absolute = (relativePath: string) => (relativePath ? `${root}/${relativePath}` : root);

	return {
		exists: (relativePath) => desktop.folders.exists(absolute(relativePath)),
		list: async (relativeDirectory) =>
			(await desktop.folders.list(absolute(relativeDirectory))).map((entry) => ({
				name: entry.name,
				isDirectory: entry.kind === "folder",
			})),
		readText: async (relativePath) => {
			try {
				return await desktop.folders.readText(absolute(relativePath));
			} catch (error) {
				if (isNotFound(error)) return null;
				throw error;
			}
		},
	};
}

export function readSmallText(path: string, maxBytes: number): Promise<string> {
	return desktop.folders.readText(path, { maxBytes });
}

export async function appDataPath(): Promise<string> {
	return (await desktop.folders.appFolder("data")).path;
}

export async function appTempPath(): Promise<string> {
	return (await desktop.folders.appFolder("temp")).path;
}

export function pathExists(path: string): Promise<boolean> {
	return desktop.folders.exists(path);
}

export function createFolder(path: string): Promise<void> {
	return desktop.folders.createFolder(path);
}

export function writeTextFile(path: string, text: string): Promise<void> {
	return desktop.folders.writeText(path, text);
}

export async function listFolderNames(path: string): Promise<string[]> {
	try {
		return (await desktop.folders.list(path)).map((entry) => entry.name);
	} catch (error) {
		if (isNotFound(error)) return [];
		throw error;
	}
}

export function deletePath(path: string): Promise<void> {
	return desktop.folders.delete(path);
}

export async function readTextFile(path: string): Promise<string | null> {
	try {
		return await desktop.folders.readText(path);
	} catch (error) {
		if (isNotFound(error)) return null;
		throw error;
	}
}

export function readFileBytes(path: string): Promise<Uint8Array> {
	return desktop.folders.readBytes(path);
}

export function writeFileBytes(path: string, bytes: Uint8Array): Promise<void> {
	return desktop.folders.writeBytes(path, bytes);
}

export interface FolderTreeEntry {
	path: string;
	kind: "file" | "folder" | "symlink" | "other";
	size: number;
}

export async function listFolderTree(path: string): Promise<FolderTreeEntry[]> {
	return (await desktop.folders.list(path, { recursive: true })).map(({ path: entryPath, kind, size }) => ({
		path: entryPath,
		kind,
		size,
	}));
}
