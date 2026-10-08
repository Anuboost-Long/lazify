import { listFolderTree, readFileBytes } from "@/platform/folders";

import { readLevelDb } from "./leveldb";

export const PROJECT_LIST_KEY = "lazify-workspace-projects";
const APP_KEY_PREFIX = "lazify-";
const PREFERRED_ORIGIN = "file://";

function decodeChromiumString(bytes: Uint8Array): string | null {
	if (bytes.length === 0) return "";
	if (bytes[0] === 1) return new TextDecoder("latin1").decode(bytes.subarray(1));
	if (bytes[0] === 0) return new TextDecoder("utf-16le").decode(bytes.subarray(1));

	return null;
}

/** Chromium stores each item under `_<origin>\0<encoded key>`, its value encoded the same way. */
export function decodeLocalStorage(entries: Array<{ key: Uint8Array; value: Uint8Array }>): Map<string, Map<string, string>> {
	const origins = new Map<string, Map<string, string>>();

	for (const { key, value } of entries) {
		if (key[0] !== 0x5f) continue;
		const separator = key.indexOf(0);
		if (separator === -1) continue;

		const origin = new TextDecoder().decode(key.subarray(1, separator));
		const name = decodeChromiumString(key.subarray(separator + 1));
		const text = decodeChromiumString(value);
		if (name === null || text === null) continue;

		if (!origins.has(origin)) origins.set(origin, new Map());
		origins.get(origin)!.set(name, text);
	}

	return origins;
}

export function lazifyItems(origins: Map<string, Map<string, string>>): Record<string, string> {
	const candidates = [...origins].filter(([, items]) => items.has(PROJECT_LIST_KEY));
	const chosen =
		candidates.find(([origin]) => origin === PREFERRED_ORIGIN) ?? candidates[0] ?? [...origins].find(([origin]) => origin === PREFERRED_ORIGIN);
	if (!chosen) return {};

	return Object.fromEntries([...chosen[1]].filter(([name]) => name.startsWith(APP_KEY_PREFIX)));
}

export async function readElectronLocalStorage(backupFolder: string): Promise<Record<string, string>> {
	const tree = await listFolderTree(`${backupFolder}/Local Storage/leveldb`).catch(() => []);
	const files = [];
	for (const entry of tree.filter((file) => file.kind === "file")) {
		files.push({ name: entry.path.slice(entry.path.lastIndexOf("/") + 1), bytes: await readFileBytes(entry.path) });
	}

	return lazifyItems(decodeLocalStorage(readLevelDb(files)));
}

export interface StoredProject {
	path: string;
	name: string;
}

export function storedProjects(items: Record<string, string>): StoredProject[] {
	try {
		const parsed: unknown = JSON.parse(items[PROJECT_LIST_KEY] ?? "[]");
		if (!Array.isArray(parsed)) return [];

		return parsed
			.filter(
				(project): project is { id: string; projectPath?: string; projectName?: string } =>
					typeof project?.id === "string",
			)
			.map((project) => {
				const path = project.projectPath ?? project.id;
				return { path, name: project.projectName ?? path.slice(path.lastIndexOf("/") + 1) };
			});
	} catch {
		return [];
	}
}

export interface LocalStorageImport {
	imported: string[];
	kept: string[];
}

export function importLocalStorageItems(items: Record<string, string>, target: Storage): LocalStorageImport {
	const report: LocalStorageImport = { imported: [], kept: [] };

	for (const [name, value] of Object.entries(items).sort(([left], [right]) => left.localeCompare(right))) {
		if (target.getItem(name) === null) {
			target.setItem(name, value);
			report.imported.push(name);
		} else {
			report.kept.push(name);
		}
	}

	return report;
}
