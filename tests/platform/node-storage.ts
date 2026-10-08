import { DatabaseSync, type SQLInputValue } from "node:sqlite";

import type { Migration, StorageScope } from "@chain/sdk";

export function createNodeStorage(file = ":memory:") {
	const db = new DatabaseSync(file);
	db.exec("PRAGMA foreign_keys = ON");
	db.exec("CREATE TABLE IF NOT EXISTS _chain_migrations (version INTEGER PRIMARY KEY, name TEXT, applied_at TEXT)");

	const scope: StorageScope = {
		async query<T>(sql: string, params: unknown[] = []) {
			return db.prepare(sql).all(...(params as SQLInputValue[])) as T[];
		},
		async execute(sql: string, params: unknown[] = []) {
			const result = db.prepare(sql).run(...(params as SQLInputValue[]));
			return { rowsAffected: Number(result.changes), lastInsertId: Number(result.lastInsertRowid) };
		},
		table() {
			throw new Error("not used");
		},
	};

	return {
		db,
		...scope,
		async migrate(migrations: Migration[]) {
			const applied = new Set(
				(db.prepare("SELECT version FROM _chain_migrations").all() as Array<{ version: number }>).map(
					(row) => row.version,
				),
			);
			for (const migration of [...migrations].sort((a, b) => a.version - b.version)) {
				if (applied.has(migration.version)) continue;
				db.exec("PRAGMA foreign_keys = OFF");
				db.exec("BEGIN");
				try {
					db.exec(migration.sql);
					db.prepare("INSERT INTO _chain_migrations VALUES (?, ?, ?)").run(
						migration.version,
						migration.name ?? null,
						new Date().toISOString(),
					);
					db.exec("COMMIT");
				} catch (error) {
					db.exec("ROLLBACK");
					throw error;
				} finally {
					db.exec("PRAGMA foreign_keys = ON");
				}
			}
		},
		async transaction<R>(work: (tx: StorageScope) => Promise<R>) {
			db.exec("BEGIN IMMEDIATE");
			try {
				const result = await work(scope);
				db.exec("COMMIT");
				return result;
			} catch (error) {
				db.exec("ROLLBACK");
				throw error;
			}
		},
	};
}
