import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { appFolders, nodeFolders } from "../../../platform/node-folders";

import { fingerprint, makeHome, makeProfile, profileIn, sqlite } from "./profile-fixture";

const nodeExecFile = promisify(execFile);
let home = "";

vi.mock("@chain/sdk", () => ({ desktop: { folders: nodeFolders } }));

vi.mock("@/platform/exec", () => ({
	environmentVariable: async (name: string) => (name === "HOME" ? home : null),
	execFile: (command: string, args: string[], options: { maxBuffer?: number } = {}) =>
		nodeExecFile(command, args, { ...options, encoding: "utf8" }),
}));

const { backupElectronProfile, inspectElectronProfile } = await import("@/shared/lib/migration/electron-profile");

beforeEach(() => {
	home = makeHome();
	appFolders.data = path.join(home, "chain-app-data");
	appFolders.temp = path.join(home, "chain-app-temp");
	fs.mkdirSync(appFolders.data);
	fs.mkdirSync(appFolders.temp);
});

afterEach(() => {
	fs.rmSync(home, { recursive: true, force: true });
});

describe("inspectElectronProfile", () => {
	it("reports a missing profile without failing", async () => {
		const report = await inspectElectronProfile();

		expect(report).toMatchObject({ path: profileIn(home), found: false, jsonStores: [], folders: [] });
	});

	it("reports the database, JSON stores and folders of a real-shaped profile", async () => {
		makeProfile(home);

		const report = await inspectElectronProfile();

		expect(report.database).toEqual({
			present: true,
			schemaVersion: 5,
			integrity: "ok",
			rowCounts: {
				prompt_presets: 2,
				context_entries: 1,
				tasks: 1,
				task_agent_runs: 1,
				task_status_events: 2,
				diagnostic_runs: 1,
			},
			missingTables: [],
			error: null,
		});
		expect(report.jsonStores.filter((store) => store.present)).toEqual([
			{ name: "custom-agents.json", present: true, valid: true, records: 1 },
			{ name: "agent-autopilot.json", present: true, valid: true, records: 2 },
			{ name: "window-zoom.json", present: true, valid: false, records: null },
		]);
		expect(report.folders.filter((folder) => folder.present).map(({ name, files }) => [name, files])).toEqual([
			["imported-templates", 2],
			["api-studio-responses", 1],
			["Local Storage", 1],
		]);
		expect(report.warnings).toEqual(["window-zoom.json isn't valid JSON and won't be imported."]);
	});

	it("warns about a database from a newer Lazify and about missing tables", async () => {
		const profile = makeProfile(home, { schemaVersion: 6 });
		sqlite(path.join(profile, "lazify.db"), "DROP TABLE diagnostic_runs;");

		const report = await inspectElectronProfile();

		expect(report.database.missingTables).toEqual(["diagnostic_runs"]);
		expect(report.warnings).toContain(
			"The database was written by a newer Lazify (schema 6; this importer knows 5).",
		);
	});

	it("reports a database it can't read instead of failing", async () => {
		const profile = makeProfile(home);
		fs.writeFileSync(path.join(profile, "lazify.db"), "not a database at all");

		const report = await inspectElectronProfile();

		expect(report.database.present).toBe(true);
		expect(report.database.error).toMatch(/not a database|file is not a database/i);
		expect(report.warnings[0]).toMatch(/^The database couldn't be read:/);
	});
});

describe("backupElectronProfile", () => {
	it("copies the database, JSON stores and kept folders, but no caches", async () => {
		const profile = makeProfile(home);

		const { folder, manifest } = await backupElectronProfile(new Date("2026-10-09T12:34:56.789Z"));

		expect(folder).toBe(path.join(appFolders.data, "electron-import/backups/2026-10-09T12-34-56Z"));
		expect(manifest.files.map((file) => file.path).sort()).toEqual([
			"Local Storage/leveldb/000003.log",
			"agent-autopilot.json",
			"api-studio-responses/key-1/r1.json",
			"custom-agents.json",
			"imported-templates/shop/files/src/index.ts",
			"imported-templates/shop/template.json",
			"lazify.db",
			"window-zoom.json",
		]);
		for (const file of manifest.files.filter((entry) => entry.path !== "lazify.db")) {
			expect(fs.readFileSync(path.join(folder, file.path))).toEqual(fs.readFileSync(path.join(profile, file.path)));
		}
		expect(fs.existsSync(path.join(folder, "Cache"))).toBe(false);
		expect(fs.existsSync(path.join(folder, "extensions"))).toBe(false);
		expect(JSON.parse(fs.readFileSync(path.join(folder, "manifest.json"), "utf8"))).toMatchObject({
			createdAt: "2026-10-09T12:34:56.789Z",
			source: profile,
		});
	});

	it("includes rows still in the write-ahead log, which a plain file copy would miss", async () => {
		const profile = makeProfile(home, { wal: true });
		const db = path.join(profile, "lazify.db");
		const electron = spawn("/usr/bin/sqlite3", [db], { stdio: ["pipe", "pipe", "inherit"] });
		electron.stdin.write(
			"PRAGMA wal_autocheckpoint = 0;\nINSERT INTO tasks (id, project_path, name, created_at, updated_at) VALUES ('task-wal', '/p', 'In the WAL', 'x', 'x');\nSELECT 'written';\n",
		);
		await new Promise<void>((resolve) => {
			let output = "";
			electron.stdout.on("data", (chunk: Buffer) => {
				output += chunk.toString();
				if (output.includes("written")) resolve();
			});
		});
		expect(fs.statSync(`${db}-wal`).size).toBeGreaterThan(0);

		const { folder } = await backupElectronProfile();
		electron.stdin.end();
		await new Promise((resolve) => electron.once("exit", resolve));

		expect(sqlite(path.join(folder, "lazify.db"), "SELECT name FROM tasks ORDER BY id;")).toBe("Add login\nIn the WAL\n");
	});

	it("never changes the Electron profile", async () => {
		const profile = makeProfile(home);
		const before = fingerprint(profile);

		await inspectElectronProfile();
		await backupElectronProfile();

		expect(fingerprint(profile)).toBe(before);
	});

	it("refuses to back up a profile that isn't there", async () => {
		await expect(backupElectronProfile()).rejects.toThrow(
			`No Electron Lazify profile was found at ${profileIn(home)}.`,
		);
	});

	it("reads a WAL-mode database after Electron closed it cleanly", async () => {
		const profile = makeProfile(home, { wal: true });
		fs.rmSync(path.join(profile, "lazify.db-shm"), { force: true });
		fs.rmSync(path.join(profile, "lazify.db-wal"), { force: true });

		const report = await inspectElectronProfile();
		const { folder } = await backupElectronProfile();

		expect(report.database.rowCounts.tasks).toBe(1);
		expect(sqlite(path.join(folder, "lazify.db"), "PRAGMA journal_mode;")).toBe("delete\n");
		expect(fs.existsSync(path.join(profile, "lazify.db-shm"))).toBe(false);
	});

	it("keeps frames from a WAL left without its shared-memory file", async () => {
		const profile = makeProfile(home, { wal: true });
		const db = path.join(profile, "lazify.db");
		const electron = spawn("/usr/bin/sqlite3", [db], { stdio: ["pipe", "pipe", "inherit"] });
		electron.stdin.write(
			"PRAGMA wal_autocheckpoint = 0;\nINSERT INTO tasks (id, project_path, name, created_at, updated_at) VALUES ('task-crash', '/p', 'Before the crash', 'x', 'x');\nSELECT 'written';\n",
		);
		await new Promise<void>((resolve) => {
			let output = "";
			electron.stdout.on("data", (chunk: Buffer) => {
				output += chunk.toString();
				if (output.includes("written")) resolve();
			});
		});
		const wal = fs.readFileSync(`${db}-wal`);
		electron.kill("SIGKILL");
		await new Promise((resolve) => electron.once("exit", resolve));
		fs.writeFileSync(`${db}-wal`, wal);
		fs.rmSync(`${db}-shm`, { force: true });

		const { folder } = await backupElectronProfile();

		expect(sqlite(path.join(folder, "lazify.db"), "SELECT name FROM tasks ORDER BY id;")).toBe("Add login\nBefore the crash\n");
	});
});
