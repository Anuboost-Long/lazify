import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MIGRATIONS } from "@/shared/lib/db/schema";

import { appFolders, nodeFolders } from "../../../platform/node-folders";
import { createNodeStorage } from "../../../platform/node-storage";

import { makeHome, makeProfile, profileIn, SAMPLE_ROWS, sqlite } from "./profile-fixture";

const nodeExecFile = promisify(execFile);
let home = "";
let storage = createNodeStorage();

vi.mock("@chain/sdk", () => ({
	desktop: {
		folders: nodeFolders,
		get storage() {
			return storage;
		},
	},
}));

vi.mock("@/platform/exec", () => ({
	environmentVariable: async (name: string) => (name === "HOME" ? home : null),
	execFile: (command: string, args: string[], options: { maxBuffer?: number } = {}) =>
		nodeExecFile(command, args, { ...options, encoding: "utf8" }),
}));

const load = async () => {
	vi.resetModules();
	return {
		...(await import("@/shared/lib/migration/electron-profile")),
		...(await import("@/shared/lib/migration/import-database")),
	};
};

beforeEach(() => {
	home = makeHome();
	appFolders.data = path.join(home, "chain-app-data");
	appFolders.temp = path.join(home, "chain-app-temp");
	fs.mkdirSync(appFolders.data);
	fs.mkdirSync(appFolders.temp);
	storage = createNodeStorage();
});

afterEach(() => {
	fs.rmSync(home, { recursive: true, force: true });
});

const sourceRows = (table: string) =>
	JSON.parse(sqlite(path.join(profileIn(home), "lazify.db"), `.mode json\nSELECT * FROM ${table} ORDER BY rowid;`) || "[]");

const targetRows = (table: string) => storage.db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all();

const TABLES = ["prompt_presets", "context_entries", "tasks", "task_agent_runs", "task_status_events", "diagnostic_runs"];

describe("importElectronDatabase", () => {
	it("copies every table with the same ids, values and order", async () => {
		makeProfile(home);
		const { backupElectronProfile, importElectronDatabase } = await load();
		const { folder } = await backupElectronProfile();

		const report = await importElectronDatabase(folder);

		for (const table of TABLES) {
			expect(targetRows(table)).toEqual(sourceRows(table));
		}
		expect(report).toMatchObject({
			sourceSchemaVersion: 5,
			missingAfterImport: [],
			foreignKeyProblems: 0,
			integrity: "ok",
			tables: {
				prompt_presets: { source: 2, inserted: 2, alreadyPresent: 0, orphaned: 0 },
				task_status_events: { source: 2, inserted: 2, alreadyPresent: 0, orphaned: 0 },
			},
		});
		expect(storage.db.prepare("SELECT backup_folder, source_schema_version FROM electron_imports").all()).toEqual([
			{ backup_folder: folder, source_schema_version: 5 },
		]);
	});

	it("adds nothing the second time, and keeps what changed in the Chain app since", async () => {
		makeProfile(home);
		const { backupElectronProfile, importElectronDatabase } = await load();
		const { folder } = await backupElectronProfile();
		await importElectronDatabase(folder);
		storage.db.prepare("UPDATE prompt_presets SET name = 'Renamed in Chain' WHERE id = 'custom-1'").run();

		const again = await importElectronDatabase(folder);

		expect(Object.values(again.tables).every((table) => table.inserted === 0)).toBe(true);
		expect(again.tables.tasks).toEqual({ source: 1, inserted: 0, alreadyPresent: 1, orphaned: 0 });
		expect(storage.db.prepare("SELECT name FROM prompt_presets WHERE id = 'custom-1'").get()).toEqual({
			name: "Renamed in Chain",
		});
		expect(storage.db.prepare("SELECT count(*) AS n FROM electron_imports").get()).toEqual({ n: 2 });
	});

	it("keeps the status events' numbering, so the next event continues after them", async () => {
		makeProfile(home);
		const { backupElectronProfile, importElectronDatabase } = await load();
		await importElectronDatabase((await backupElectronProfile()).folder);

		storage.db
			.prepare("INSERT INTO task_status_events (task_id, status, source, created_at) VALUES ('task-1', 'done', 'manual', 'now')")
			.run();

		expect(storage.db.prepare("SELECT id, status FROM task_status_events ORDER BY id").all()).toEqual([
			{ id: 1, status: "todo" },
			{ id: 2, status: "doing" },
			{ id: 3, status: "done" },
		]);
	});

	it("skips runs and events whose task was deleted in Electron, and says how many", async () => {
		makeProfile(home, {
			rows: `${SAMPLE_ROWS}
INSERT INTO task_agent_runs (id, task_id, generated_prompt, started_at) VALUES ('run-orphan', 'task-deleted', 'x', 'x');
INSERT INTO task_status_events (task_id, status, created_at) VALUES ('task-deleted', 'todo', 'x');`,
		});
		const { backupElectronProfile, importElectronDatabase } = await load();

		const report = await importElectronDatabase((await backupElectronProfile()).folder);

		expect(report.tables.task_agent_runs).toEqual({ source: 2, inserted: 1, alreadyPresent: 0, orphaned: 1 });
		expect(report.tables.task_status_events).toEqual({ source: 3, inserted: 2, alreadyPresent: 0, orphaned: 1 });
		expect(report.missingAfterImport).toEqual([]);
		expect(report.foreignKeyProblems).toBe(0);
	});

	it("brings an older Electron database up to date first, as Electron would", async () => {
		const profile = profileIn(home);
		fs.mkdirSync(profile, { recursive: true });
		sqlite(
			path.join(profile, "lazify.db"),
			`${MIGRATIONS[0]};\n${MIGRATIONS[1]};\nPRAGMA user_version = 2;
INSERT INTO context_entries (id, scope, kind, context_key, context_value, created_at, updated_at) VALUES ('old-rule', 'global', 'rule', '', 'use pnpm', 'x', 'x');
INSERT INTO context_entries (id, scope, kind, context_key, context_value, created_at, updated_at) VALUES ('old-fact', 'global', 'fact', 'os', 'macOS', 'x', 'x');`,
		);
		const { backupElectronProfile, importElectronDatabase } = await load();
		const { folder } = await backupElectronProfile();

		const report = await importElectronDatabase(folder);

		expect(report.sourceSchemaVersion).toBe(2);
		expect(storage.db.prepare("SELECT id, payload FROM context_entries ORDER BY id").all()).toEqual([
			{ id: "old-fact", payload: '{"key":"os","value":"macOS"}' },
			{ id: "old-rule", payload: '{"strength":"required","action":"use pnpm"}' },
		]);
		expect(report.tables.diagnostic_runs).toEqual({ source: 0, inserted: 0, alreadyPresent: 0, orphaned: 0 });
		expect(sqlite(path.join(profile, "lazify.db"), "PRAGMA user_version;")).toBe("2\n");
	});

	it("refuses a database from a newer Lazify and imports nothing", async () => {
		makeProfile(home, { schemaVersion: 6 });
		const { backupElectronProfile, importElectronDatabase } = await load();
		const { folder } = await backupElectronProfile();

		await expect(importElectronDatabase(folder)).rejects.toThrow(
			"This backup was written by a newer Lazify (schema 6); this version can import up to schema 5.",
		);
		expect(storage.db.prepare("SELECT name FROM sqlite_master WHERE name = 'prompt_presets'").all()).toEqual([]);
	});

	it("rolls the whole import back when one row fails", async () => {
		makeProfile(home);
		const { backupElectronProfile, importElectronDatabase } = await load();
		const { folder } = await backupElectronProfile();
		await storage.migrate((await import("@/platform/database")).APP_MIGRATIONS);
		storage.db.exec(
			"CREATE TRIGGER refuse_diag BEFORE INSERT ON diagnostic_runs BEGIN SELECT RAISE(ABORT, 'disk full'); END;",
		);

		await expect(importElectronDatabase(folder)).rejects.toThrow("disk full");

		for (const table of TABLES) expect(targetRows(table)).toEqual([]);
		expect(storage.db.prepare("SELECT count(*) AS n FROM electron_imports").get()).toEqual({ n: 0 });
	});
});
