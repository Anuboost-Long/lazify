import { desktop } from "@chain/sdk";
import type { ChainError, FolderEntry } from "@chain/sdk";

import { uniqueId } from "@/shared/lib/unique-id";

const NODE_DESCRIPTIONS: Record<string, string> = {
	ENOENT: "no such file or directory",
	EACCES: "permission denied",
	EINVAL: "invalid argument",
	EFBIG: "file too large",
	EBUSY: "resource busy or locked",
};

const NODE_CODES: Record<string, string> = {
	NOT_FOUND: "ENOENT",
	NOT_GRANTED: "EACCES",
	PERMISSION_DENIED: "EACCES",
	INVALID_ARGUMENT: "EINVAL",
	TOO_LARGE: "EFBIG",
	UNAVAILABLE: "EBUSY",
};

export class FsError extends Error {
	constructor(
		message: string,
		readonly code: string,
		readonly path: string,
	) {
		super(message);
		this.name = "FsError";
	}
}

async function chain<T>(syscall: string, path: string, call: () => Promise<T>): Promise<T> {
	try {
		return await call();
	} catch (error) {
		const { code = "", message = String(error) } = (error ?? {}) as Partial<ChainError>;
		const nodeCode = NODE_CODES[code];
		if (!nodeCode) throw new FsError(message, code, path);

		throw new FsError(`${nodeCode}: ${NODE_DESCRIPTIONS[nodeCode]}, ${syscall} '${path}'`, nodeCode, path);
	}
}

export class FileBytes extends Uint8Array {
	override toString(encoding?: "base64" | "utf8"): string {
		if (encoding !== "base64") return new TextDecoder().decode(this);

		let binary = "";
		for (let index = 0; index < this.length; index += 0x8000) {
			binary += String.fromCodePoint(...this.subarray(index, index + 0x8000));
		}

		return btoa(binary);
	}
}

export interface Stats {
	size: number;
	mtimeMs: number;
	isFile(): boolean;
	isDirectory(): boolean;
	isSymbolicLink(): boolean;
}

export interface Dirent {
	name: string;
	isFile(): boolean;
	isDirectory(): boolean;
	isSymbolicLink(): boolean;
}

const kindChecks = ({ kind }: Pick<FolderEntry, "kind">) => ({
	isFile: () => kind === "file",
	isDirectory: () => kind === "folder",
	isSymbolicLink: () => kind === "symlink",
});

interface FolderSnapshot {
	root: string;
	children: Map<string, FolderEntry[]>;
	entries: Map<string, FolderEntry>;
}

const snapshots = new Set<FolderSnapshot>();

const parentOf = (path: string) => path.slice(0, path.lastIndexOf("/")) || "/";

const snapshotFor = (path: string) =>
	[...snapshots].find((snapshot) => path === snapshot.root || path.startsWith(`${snapshot.root}/`));

export async function withFolderSnapshot<T>(root: string, skipFolders: string[], read: () => Promise<T>): Promise<T> {
	let listing: FolderEntry[];
	try {
		listing = await desktop.folders.list(root, { recursive: true, skipFolders });
	} catch {
		return read();
	}

	const snapshot: FolderSnapshot = { root, children: new Map([[root, []]]), entries: new Map() };
	const skipped = new Set(skipFolders);

	for (const entry of listing) {
		snapshot.entries.set(entry.path, entry);
		if (entry.kind === "folder" && !skipped.has(entry.name)) snapshot.children.set(entry.path, []);
	}
	for (const entry of listing) snapshot.children.get(parentOf(entry.path))?.push(entry);

	snapshots.add(snapshot);
	try {
		return await read();
	} finally {
		snapshots.delete(snapshot);
	}
}

export function readFile(path: string): Promise<FileBytes>;
export function readFile(path: string, encoding: "utf8"): Promise<string>;
export async function readFile(path: string, encoding?: "utf8"): Promise<FileBytes | string> {
	if (encoding) return chain("open", path, () => desktop.folders.readText(path));

	const bytes = await chain("open", path, () => desktop.folders.readBytes(path));
	return new FileBytes(bytes);
}

export async function readdir(path: string, _options: { withFileTypes: true }): Promise<Dirent[]> {
	const entries = snapshotFor(path)?.children.get(path) ?? (await chain("scandir", path, () => desktop.folders.list(path)));
	return entries.map((entry) => ({ name: entry.name, ...kindChecks(entry) }));
}

export async function stat(path: string): Promise<Stats> {
	const entry = snapshotFor(path)?.entries.get(path) ?? (await chain("stat", path, () => desktop.folders.stat(path)));
	return { size: entry.size, mtimeMs: entry.modifiedMs, ...kindChecks(entry) };
}

type WriteOptions = "utf8" | { encoding: "utf8"; flag?: "w" | "wx" };

/**
 * `wx` creates the file and never truncates one that is already there. Chain
 * has no create-only write, but `move` refuses an existing target, so the text
 * goes to a staging file beside it and is moved into place.
 */
export async function writeFile(path: string, text: string, options: WriteOptions): Promise<void> {
	const flag = typeof options === "string" ? "w" : (options.flag ?? "w");
	if (flag === "w") return chain("open", path, () => desktop.folders.writeText(path, text));

	const staging = `${parentOf(path)}/.${uniqueId("lazify-create")}`;
	await chain("open", staging, () => desktop.folders.writeText(staging, text));
	try {
		await desktop.folders.move(staging, path);
	} catch (error) {
		await desktop.folders.delete(staging);
		if (await desktop.folders.exists(path)) {
			throw new FsError(`EEXIST: file already exists, open '${path}'`, "EEXIST", path);
		}
		return chain("open", path, () => Promise.reject(error));
	}
}

export default { readFile, readdir, stat, writeFile };
