import {
	appDataPath,
	createFolder,
	listFolderTree,
	pathExists,
	readFileBytes,
	readTextFile,
	writeFileBytes,
} from "@/platform/folders";

import { JSON_STORES } from "./electron-profile";

export const HELD_STORES: Record<string, string> = {
	"api-studio-environments.json":
		"Holds API Studio secrets in plain text. Kept in the backup until it's decided where secrets go (D-7).",
};

export const IMPORTED_FOLDERS = [
	"imported-templates",
	"api-studio-responses",
	"api-studio-collection-bodies",
	"api-studio-downloads",
] as const;

export type FileOutcome = "imported" | "kept" | "invalid" | "held" | "absent";

export interface FilesImportReport {
	stores: Array<{ name: string; outcome: FileOutcome; reason?: string }>;
	folders: Array<{ name: string; imported: number; kept: number }>;
}

async function importStore(backupFolder: string, target: string, name: string) {
	if (HELD_STORES[name]) {
		const present = await pathExists(`${backupFolder}/${name}`);
		return { name, outcome: present ? ("held" as const) : ("absent" as const), reason: present ? HELD_STORES[name] : undefined };
	}

	const text = await readTextFile(`${backupFolder}/${name}`).catch(() => null);
	if (text === null) return { name, outcome: "absent" as const };

	try {
		JSON.parse(text);
	} catch {
		return { name, outcome: "invalid" as const, reason: `${name} isn't valid JSON.` };
	}

	if (await pathExists(`${target}/${name}`)) return { name, outcome: "kept" as const };

	await writeFileBytes(`${target}/${name}`, await readFileBytes(`${backupFolder}/${name}`));
	return { name, outcome: "imported" as const };
}

async function importFolder(backupFolder: string, target: string, name: string) {
	const tree = await listFolderTree(`${backupFolder}/${name}`).catch(() => null);
	const report = { name, imported: 0, kept: 0 };
	if (!tree) return report;

	await createFolder(`${target}/${name}`);
	for (const entry of tree) {
		const relative = entry.path.slice(backupFolder.length + 1);
		if (entry.kind === "folder") await createFolder(`${target}/${relative}`);
		if (entry.kind !== "file") continue;

		if (await pathExists(`${target}/${relative}`)) {
			report.kept += 1;
			continue;
		}
		await writeFileBytes(`${target}/${relative}`, await readFileBytes(entry.path));
		report.imported += 1;
	}

	return report;
}

export async function importElectronFiles(backupFolder: string): Promise<FilesImportReport> {
	const target = await appDataPath();
	const stores = [];
	for (const name of JSON_STORES) stores.push(await importStore(backupFolder, target, name));

	const folders = [];
	for (const name of IMPORTED_FOLDERS) folders.push(await importFolder(backupFolder, target, name));

	return { stores, folders };
}
