import fs from "node:fs";
import path from "node:path";

import { installedRecordPath } from "./paths";
import type { InstalledExtension, InstalledRecord } from "./types";

function readRecord(): InstalledRecord {
	try {
		const parsed = JSON.parse(fs.readFileSync(installedRecordPath(), "utf8")) as InstalledRecord;

		return typeof parsed === "object" && parsed !== null ? parsed : {};
	} catch {
		return {};
	}
}

function writeRecord(record: InstalledRecord): InstalledRecord {
	const filePath = installedRecordPath();

	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, `${JSON.stringify(record, null, 2)}\n`, "utf8");

	return record;
}

export const installedExtensions = readRecord;

export const installedExtension = (id: string): InstalledExtension | null =>
	readRecord()[id] ?? null;

export function rememberInstall(id: string, version: string): InstalledExtension {
	const record = readRecord();
	const entry: InstalledExtension = {
		version,
		enabled: record[id]?.enabled ?? true,
		installedAt: new Date().toISOString(),
	};

	writeRecord({ ...record, [id]: entry });

	return entry;
}

export function forgetInstall(id: string): void {
	const record = readRecord();

	delete record[id];
	writeRecord(record);
}

export function setExtensionEnabled(id: string, enabled: boolean): InstalledExtension | null {
	const record = readRecord();
	const existing = record[id];

	if (!existing) return null;

	const entry = { ...existing, enabled };

	writeRecord({ ...record, [id]: entry });

	return entry;
}
