import { database } from "@/platform/database";
import { pathExistsOnDisk } from "@/platform/exec";

import {
	readElectronLocalStorage,
	storedProjects,
	importLocalStorageItems,
	type LocalStorageImport,
	type StoredProject,
} from "./electron-local-storage";
import { backupElectronProfile, inspectElectronProfile, type ProfileReport } from "./electron-profile";
import { importElectronDatabase, type DatabaseImportReport } from "./import-database";
import { importElectronFiles, type FilesImportReport } from "./import-files";

export interface ImportOffer {
	report: ProfileReport;
	projects: StoredProject[];
}

export interface ProjectLink extends StoredProject {
	exists: boolean;
}

export interface ElectronImportResult {
	backupFolder: string;
	database: DatabaseImportReport | null;
	files: FilesImportReport;
	settings: LocalStorageImport;
	projects: ProjectLink[];
}

export async function hasImportedBefore(): Promise<boolean> {
	const storage = await database();
	const [{ count }] = await storage.query<{ count: number }>("SELECT count(*) AS count FROM electron_imports");

	return count > 0;
}

export async function offerElectronImport(): Promise<ImportOffer | null> {
	const report = await inspectElectronProfile();
	if (!report.found) return null;

	const items = await readElectronLocalStorage(report.path).catch(() => ({}));
	return { report, projects: storedProjects(items) };
}

export async function runElectronImport(target: Storage, now = new Date()): Promise<ElectronImportResult> {
	const { folder, manifest } = await backupElectronProfile(now);

	const databaseReport = manifest.report.database.present ? await importElectronDatabase(folder) : null;
	if (!databaseReport) {
		const storage = await database();
		await storage.execute(
			"INSERT INTO electron_imports (backup_folder, source_schema_version, imported_at, counts) VALUES (?, 0, ?, '{}')",
			[folder, now.toISOString()],
		);
	}
	const files = await importElectronFiles(folder);
	const items = await readElectronLocalStorage(folder);
	const settings = importLocalStorageItems(items, target);

	const projects: ProjectLink[] = [];
	for (const project of storedProjects(items)) {
		projects.push({ ...project, exists: await pathExistsOnDisk(project.path) });
	}

	return { backupFolder: folder, database: databaseReport, files, settings, projects };
}
