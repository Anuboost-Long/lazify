import { createFolder, readTextFile, writeTextFile } from "@/platform/folders";
import path from "@/shared/lib/path";

import { installedRecordPath } from "./paths";
import type { InstalledExtension, InstalledRecord } from "./types";

async function readRecord(): Promise<InstalledRecord> {
	try {
		const parsed = JSON.parse((await readTextFile(await installedRecordPath())) ?? "") as InstalledRecord;

		return typeof parsed === "object" && parsed !== null ? parsed : {};
	} catch {
		return {};
	}
}

async function writeRecord(record: InstalledRecord): Promise<InstalledRecord> {
	const filePath = await installedRecordPath();

	await createFolder(path.dirname(filePath));
	await writeTextFile(filePath, `${JSON.stringify(record, null, 2)}\n`);

	return record;
}

export const installedExtensions = readRecord;

export const installedExtension = async (id: string): Promise<InstalledExtension | null> =>
	(await readRecord())[id] ?? null;

export async function rememberInstall(id: string, version: string): Promise<InstalledExtension> {
	const record = await readRecord();
	const entry: InstalledExtension = {
		version,
		enabled: record[id]?.enabled ?? true,
		installedAt: new Date().toISOString(),
	};

	await writeRecord({ ...record, [id]: entry });

	return entry;
}

export async function forgetInstall(id: string): Promise<void> {
	const record = await readRecord();

	delete record[id];
	await writeRecord(record);
}

export async function setExtensionEnabled(id: string, enabled: boolean): Promise<InstalledExtension | null> {
	const record = await readRecord();
	const existing = record[id];

	if (!existing) return null;

	const entry = { ...existing, enabled };

	await writeRecord({ ...record, [id]: entry });

	return entry;
}
