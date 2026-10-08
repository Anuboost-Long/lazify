import { environmentVariable, execFile } from "@/platform/exec";
import {
	appDataPath,
	appTempPath,
	createFolder,
	listFolderTree,
	pathExists,
	readFileBytes,
	readTextFile,
	writeFileBytes,
	writeTextFile,
} from "@/platform/folders";

export const ELECTRON_SCHEMA_VERSION = 5;

export const ELECTRON_TABLES = [
	"prompt_presets",
	"context_entries",
	"tasks",
	"task_agent_runs",
	"task_status_events",
	"diagnostic_runs",
] as const;

export type ElectronTable = (typeof ELECTRON_TABLES)[number];

export const JSON_STORES = [
	"custom-agents.json",
	"agent-token-budgets.json",
	"agent-autopilot.json",
	"keep-awake.json",
	"code-formatter.json",
	"window-zoom.json",
	"api-studio-environments.json",
	"api-studio-requests.json",
	"api-studio-collections.json",
	"api-studio-allowed-hosts.json",
	"api-studio-docs.json",
	"popup-allowlist.json",
	"lazy-shield.json",
] as const;

export const KEPT_FOLDERS = [
	"imported-templates",
	"api-studio-responses",
	"api-studio-collection-bodies",
	"api-studio-downloads",
	"Local Storage",
] as const;

const DATABASE_FILE = "lazify.db";

export interface DatabaseReport {
	present: boolean;
	schemaVersion: number | null;
	integrity: string | null;
	rowCounts: Partial<Record<ElectronTable, number>>;
	missingTables: ElectronTable[];
	error: string | null;
}

export interface JsonStoreReport {
	name: string;
	present: boolean;
	valid: boolean;
	records: number | null;
}

export interface FolderReport {
	name: string;
	present: boolean;
	files: number;
	bytes: number;
}

export interface ProfileReport {
	path: string;
	found: boolean;
	database: DatabaseReport;
	jsonStores: JsonStoreReport[];
	folders: FolderReport[];
	warnings: string[];
}

export async function electronProfilePath(): Promise<string> {
	return `${(await environmentVariable("HOME")) ?? ""}/Library/Application Support/lazify`;
}

const uriOf = (file: string, query: string) =>
	`file:${file.replaceAll("%", "%25").replaceAll("?", "%3f").replaceAll("#", "%23")}?${query}`;

/**
 * A SQLite URI that reads `file` without writing beside it. A database in WAL
 * mode can only be opened read-only while its `-shm` file exists, which is the
 * case while Electron has it open. Without either file it closed cleanly and
 * nothing is pending, so it is opened as immutable. A `-wal` left without its
 * `-shm` is read from a copy, so its frames aren't lost.
 */
async function readableSource(file: string): Promise<string> {
	if (await pathExists(`${file}-shm`)) return uriOf(file, "mode=ro");
	if (!(await pathExists(`${file}-wal`))) return uriOf(file, "mode=ro&immutable=1");

	const copy = `${await appTempPath()}/electron-import-${crypto.randomUUID()}.db`;
	await writeFileBytes(copy, await readFileBytes(file));
	await writeFileBytes(`${copy}-wal`, await readFileBytes(`${file}-wal`));

	return copy;
}

async function sqliteJson<T>(file: string, statement: string): Promise<T[]> {
	const { stdout } = await execFile("sqlite3", ["-json", await readableSource(file), statement], {
		maxBuffer: 64 * 1024 * 1024,
	});

	return stdout.trim() ? (JSON.parse(stdout) as T[]) : [];
}

export { sqliteJson as readSqliteRows };

async function inspectDatabase(profile: string): Promise<DatabaseReport> {
	const file = `${profile}/${DATABASE_FILE}`;
	const report: DatabaseReport = {
		present: await pathExists(file),
		schemaVersion: null,
		integrity: null,
		rowCounts: {},
		missingTables: [],
		error: null,
	};
	if (!report.present) return report;

	try {
		const [{ user_version: version }] = await sqliteJson<{ user_version: number }>(file, "PRAGMA user_version");
		report.schemaVersion = version;

		const [{ integrity_check: integrity }] = await sqliteJson<{ integrity_check: string }>(
			file,
			"PRAGMA integrity_check",
		);
		report.integrity = integrity;

		const tables = new Set(
			(await sqliteJson<{ name: string }>(file, "SELECT name FROM sqlite_master WHERE type = 'table'")).map(
				(row) => row.name,
			),
		);

		for (const table of ELECTRON_TABLES) {
			if (!tables.has(table)) {
				report.missingTables.push(table);
				continue;
			}
			const [{ count }] = await sqliteJson<{ count: number }>(file, `SELECT count(*) AS count FROM ${table}`);
			report.rowCounts[table] = count;
		}
	} catch (error) {
		report.error = error instanceof Error ? error.message : String(error);
	}

	return report;
}

function recordCount(value: unknown): number | null {
	if (Array.isArray(value)) return value.length;
	if (value && typeof value === "object") return Object.keys(value).length;

	return null;
}

async function inspectJsonStore(profile: string, name: string): Promise<JsonStoreReport> {
	const text = await readTextFile(`${profile}/${name}`).catch(() => null);
	if (text === null) return { name, present: false, valid: false, records: null };

	try {
		return { name, present: true, valid: true, records: recordCount(JSON.parse(text)) };
	} catch {
		return { name, present: true, valid: false, records: null };
	}
}

async function inspectFolder(profile: string, name: string): Promise<FolderReport> {
	const tree = await listFolderTree(`${profile}/${name}`).catch(() => null);
	if (!tree) return { name, present: false, files: 0, bytes: 0 };

	const files = tree.filter((entry) => entry.kind === "file");
	return { name, present: true, files: files.length, bytes: files.reduce((sum, entry) => sum + entry.size, 0) };
}

export async function inspectElectronProfile(profile?: string): Promise<ProfileReport> {
	const path = profile ?? (await electronProfilePath());
	const found = await pathExists(path).catch(() => false);
	const report: ProfileReport = {
		path,
		found,
		database: { present: false, schemaVersion: null, integrity: null, rowCounts: {}, missingTables: [], error: null },
		jsonStores: [],
		folders: [],
		warnings: [],
	};
	if (!found) return report;

	report.database = await inspectDatabase(path);
	report.jsonStores = await Promise.all(JSON_STORES.map((name) => inspectJsonStore(path, name)));
	report.folders = await Promise.all(KEPT_FOLDERS.map((name) => inspectFolder(path, name)));

	const { database } = report;
	if (!database.present) report.warnings.push("No lazify.db was found, so there are no prompts or tasks to import.");
	if (database.error) report.warnings.push(`The database couldn't be read: ${database.error}`);
	if (database.integrity && database.integrity !== "ok") {
		report.warnings.push(`The database failed its integrity check: ${database.integrity}`);
	}
	if (database.schemaVersion !== null && database.schemaVersion > ELECTRON_SCHEMA_VERSION) {
		report.warnings.push(
			`The database was written by a newer Lazify (schema ${database.schemaVersion}; this importer knows ${ELECTRON_SCHEMA_VERSION}).`,
		);
	}
	for (const store of report.jsonStores) {
		if (store.present && !store.valid) report.warnings.push(`${store.name} isn't valid JSON and won't be imported.`);
	}

	return report;
}

export interface BackupManifest {
	createdAt: string;
	source: string;
	files: Array<{ path: string; bytes: number }>;
	report: ProfileReport;
}

export interface BackupResult {
	folder: string;
	manifest: BackupManifest;
}

const timestampFolderName = (date: Date) => date.toISOString().replaceAll(":", "-").replace(/\.\d+Z$/, "Z");

async function copyFile(from: string, to: string): Promise<number> {
	const bytes = await readFileBytes(from);
	await writeFileBytes(to, bytes);

	return bytes.length;
}

export async function backupElectronProfile(now = new Date(), profile?: string): Promise<BackupResult> {
	const report = await inspectElectronProfile(profile);
	if (!report.found) throw new Error(`No Electron Lazify profile was found at ${report.path}.`);

	const folder = `${await appDataPath()}/electron-import/backups/${timestampFolderName(now)}`;
	await createFolder(folder);
	const files: BackupManifest["files"] = [];

	if (report.database.present) {
		const target = `${folder}/${DATABASE_FILE}`;
		await execFile("sqlite3", [
			await readableSource(`${report.path}/${DATABASE_FILE}`),
			`.backup '${target.replaceAll("'", "''")}'`,
		]);
		await execFile("sqlite3", [target, "PRAGMA journal_mode = DELETE"]);
		const [{ count }] = await sqliteJson<{ count: number }>(
			`${folder}/${DATABASE_FILE}`,
			"SELECT count(*) AS count FROM sqlite_master",
		);
		if (count === 0) throw new Error("The database backup came out empty.");
		files.push({ path: DATABASE_FILE, bytes: (await readFileBytes(`${folder}/${DATABASE_FILE}`)).length });
	}

	for (const store of report.jsonStores.filter((entry) => entry.present)) {
		files.push({ path: store.name, bytes: await copyFile(`${report.path}/${store.name}`, `${folder}/${store.name}`) });
	}

	for (const kept of report.folders.filter((entry) => entry.present)) {
		await createFolder(`${folder}/${kept.name}`);
		for (const entry of await listFolderTree(`${report.path}/${kept.name}`)) {
			const relative = entry.path.slice(report.path.length + 1);
			if (entry.kind === "folder") await createFolder(`${folder}/${relative}`);
			if (entry.kind !== "file") continue;

			files.push({ path: relative, bytes: await copyFile(entry.path, `${folder}/${relative}`) });
		}
	}

	const manifest: BackupManifest = { createdAt: now.toISOString(), source: report.path, files, report };
	await writeTextFile(`${folder}/manifest.json`, JSON.stringify(manifest, null, 2));

	return { folder, manifest };
}
