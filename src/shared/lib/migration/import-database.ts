import { database } from "@/platform/database";
import { execFile } from "@/platform/exec";
import { MIGRATIONS } from "@/shared/lib/db/schema";

import { ELECTRON_SCHEMA_VERSION, ELECTRON_TABLES, readSqliteRows, type ElectronTable } from "./electron-profile";

export interface TableImport {
	source: number;
	inserted: number;
	alreadyPresent: number;
	orphaned: number;
}

export interface DatabaseImportReport {
	backupFolder: string;
	sourceSchemaVersion: number;
	tables: Record<ElectronTable, TableImport>;
	missingAfterImport: string[];
	foreignKeyProblems: number;
	integrity: string;
}

type Row = Record<string, unknown> & { id: string | number };

/**
 * Electron declared these foreign keys but never turned enforcement on, so a
 * deleted task can have left its runs and events behind. Chain storage
 * enforces them, so such rows are skipped and counted rather than failing the
 * whole import.
 */
const CHILD_OF_TASK: ReadonlySet<ElectronTable> = new Set(["task_agent_runs", "task_status_events"]);

const keyOf = (row: Row) => `${row.id}`;

async function upgradeBackup(file: string): Promise<number> {
	const [{ user_version: version }] = await readSqliteRows<{ user_version: number }>(file, "PRAGMA user_version");

	if (version > ELECTRON_SCHEMA_VERSION) {
		throw new Error(
			`This backup was written by a newer Lazify (schema ${version}); this version can import up to schema ${ELECTRON_SCHEMA_VERSION}.`,
		);
	}

	for (let step = version; step < MIGRATIONS.length; step += 1) {
		await execFile("sqlite3", [file, `${MIGRATIONS[step]}\nPRAGMA user_version = ${step + 1};`]);
	}

	return version;
}

async function columnsOf(file: string, table: ElectronTable): Promise<string[]> {
	return (await readSqliteRows<{ name: string }>(file, `PRAGMA table_info(${table})`)).map((column) => column.name);
}

export async function importElectronDatabase(backupFolder: string): Promise<DatabaseImportReport> {
	const file = `${backupFolder}/lazify.db`;
	const sourceSchemaVersion = await upgradeBackup(file);
	const storage = await database();

	const sources = new Map<ElectronTable, Row[]>();
	const columns = new Map<ElectronTable, string[]>();
	for (const table of ELECTRON_TABLES) {
		sources.set(table, await readSqliteRows<Row>(file, `SELECT * FROM ${table} ORDER BY rowid`));
		columns.set(table, await columnsOf(file, table));
	}

	const tables = {} as Record<ElectronTable, TableImport>;
	const taskIds = new Set([
		...(sources.get("tasks") ?? []).map(keyOf),
		...(await storage.query<Row>("SELECT id FROM tasks")).map(keyOf),
	]);

	await storage.transaction(async (tx) => {
		for (const table of ELECTRON_TABLES) {
			const names = columns.get(table) ?? [];
			const statement = `INSERT OR IGNORE INTO ${table} (${names.join(", ")}) VALUES (${names.map(() => "?").join(", ")})`;
			const all = sources.get(table) ?? [];
			const rows = CHILD_OF_TASK.has(table) ? all.filter((row) => taskIds.has(`${row.task_id as string}`)) : all;
			let inserted = 0;

			for (const row of rows) {
				const { rowsAffected } = await tx.execute(
					statement,
					names.map((name) => row[name] ?? null),
				);
				inserted += rowsAffected;
			}

			tables[table] = {
				source: all.length,
				inserted,
				alreadyPresent: rows.length - inserted,
				orphaned: all.length - rows.length,
			};
		}

		await tx.execute(
			"INSERT INTO electron_imports (backup_folder, source_schema_version, imported_at, counts) VALUES (?, ?, ?, ?)",
			[backupFolder, sourceSchemaVersion, new Date().toISOString(), JSON.stringify(tables)],
		);
	});

	const missingAfterImport: string[] = [];
	for (const table of ELECTRON_TABLES) {
		const present = new Set((await storage.query<Row>(`SELECT id FROM ${table}`)).map(keyOf));
		for (const row of sources.get(table) ?? []) {
			const orphan = CHILD_OF_TASK.has(table) && !taskIds.has(`${row.task_id as string}`);
			if (!orphan && !present.has(keyOf(row))) missingAfterImport.push(`${table}:${keyOf(row)}`);
		}
	}

	const foreignKeyProblems = (await storage.query("PRAGMA foreign_key_check")).length;
	const [{ integrity_check: integrity }] = await storage.query<{ integrity_check: string }>("PRAGMA integrity_check");

	return { backupFolder, sourceSchemaVersion, tables, missingAfterImport, foreignKeyProblems, integrity };
}
