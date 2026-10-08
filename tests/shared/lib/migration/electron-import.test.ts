import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { appFolders, nodeFolders } from "../../../platform/node-folders";
import { createNodeStorage } from "../../../platform/node-storage";

import { makeHome, makeProfile, profileIn } from "./profile-fixture";

const nodeExecFile = promisify(execFile);
let home = "";
let storage = createNodeStorage();
let existingPaths = new Set<string>();

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
	pathExistsOnDisk: async (target: string) => existingPaths.has(target),
	execFile: (command: string, args: string[], options: { maxBuffer?: number } = {}) =>
		nodeExecFile(command, args, { ...options, encoding: "utf8" }),
}));

const chromeLevelDb = path.join(import.meta.dirname, "fixtures/chrome-local-storage/leveldb");

class MemoryStorage implements Storage {
	private readonly items = new Map<string, string>();
	get length() {
		return this.items.size;
	}
	clear() {
		this.items.clear();
	}
	getItem(key: string) {
		return this.items.get(key) ?? null;
	}
	key(index: number) {
		return [...this.items.keys()][index] ?? null;
	}
	removeItem(key: string) {
		this.items.delete(key);
	}
	setItem(key: string, value: string) {
		this.items.set(key, value);
	}
}

const load = async () => {
	vi.resetModules();
	return import("@/shared/lib/migration/electron-import");
};

function profileWithProjects(options: Parameters<typeof makeProfile>[1] = {}) {
	const profile = makeProfile(home, options);
	fs.rmSync(path.join(profile, "Local Storage"), { recursive: true, force: true });
	fs.mkdirSync(path.join(profile, "Local Storage/leveldb"), { recursive: true });
	for (const name of fs.readdirSync(chromeLevelDb)) {
		fs.copyFileSync(path.join(chromeLevelDb, name), path.join(profile, "Local Storage/leveldb", name));
	}
	return profile;
}

beforeEach(() => {
	home = makeHome();
	appFolders.data = path.join(home, "chain-app-data");
	appFolders.temp = path.join(home, "chain-app-temp");
	fs.mkdirSync(appFolders.data);
	fs.mkdirSync(appFolders.temp);
	storage = createNodeStorage();
	existingPaths = new Set(["/Users/dev/Work/shop"]);
});

afterEach(() => {
	fs.rmSync(home, { recursive: true, force: true });
});

describe("Electron import flow", () => {
	it("offers nothing when there is no Electron profile", async () => {
		const { offerElectronImport } = await load();

		await expect(offerElectronImport()).resolves.toBeNull();
	});

	it("offers what it found, including the projects, before anything is imported", async () => {
		profileWithProjects();
		const { offerElectronImport, hasImportedBefore } = await load();

		const offer = await offerElectronImport();

		expect(offer?.report.database.rowCounts.tasks).toBe(1);
		expect(offer?.projects).toEqual([
			{ path: "/Users/dev/Work/shop", name: "shop" },
			{ path: "/Users/dev/Work/日本語-app", name: "日本語-app" },
		]);
		expect(fs.existsSync(path.join(appFolders.data, "electron-import"))).toBe(false);
		await expect(hasImportedBefore()).resolves.toBe(false);
	});

	it("backs up, then imports the database, files and settings, and checks each project", async () => {
		profileWithProjects();
		const { runElectronImport, hasImportedBefore } = await load();
		const target = new MemoryStorage();

		const result = await runElectronImport(target, new Date("2026-10-09T10:00:00Z"));

		expect(result.backupFolder).toBe(path.join(appFolders.data, "electron-import/backups/2026-10-09T10-00-00Z"));
		expect(result.database?.tables.tasks.inserted).toBe(1);
		expect(result.files.stores.find((store) => store.name === "custom-agents.json")?.outcome).toBe("imported");
		expect(result.settings.imported).toEqual([
			"lazify-active-project",
			"lazify-language",
			"lazify-note",
			"lazify-project-directory",
			"lazify-theme",
			"lazify-workspace-projects",
		]);
		expect(target.getItem("lazify-theme")).toBe("dark");
		expect(result.projects).toEqual([
			{ path: "/Users/dev/Work/shop", name: "shop", exists: true },
			{ path: "/Users/dev/Work/日本語-app", name: "日本語-app", exists: false },
		]);
		await expect(hasImportedBefore()).resolves.toBe(true);
	});

	it("records an import even when the profile has no database, so it isn't offered again", async () => {
		const profile = profileWithProjects();
		fs.rmSync(path.join(profile, "lazify.db"));
		const { runElectronImport, hasImportedBefore } = await load();

		const result = await runElectronImport(new MemoryStorage());

		expect(result.database).toBeNull();
		await expect(hasImportedBefore()).resolves.toBe(true);
	});

	it("keeps settings the Chain app already has when importing again", async () => {
		profileWithProjects();
		const { runElectronImport } = await load();
		const target = new MemoryStorage();
		target.setItem("lazify-theme", "light");

		const first = await runElectronImport(target, new Date("2026-10-09T10:00:00Z"));
		const second = await runElectronImport(target, new Date("2026-10-09T11:00:00Z"));

		expect(first.settings.kept).toEqual(["lazify-theme"]);
		expect(target.getItem("lazify-theme")).toBe("light");
		expect(second.settings.imported).toEqual([]);
		expect(second.database?.tables.tasks).toMatchObject({ inserted: 0, alreadyPresent: 1 });
		expect(fs.readdirSync(path.join(appFolders.data, "electron-import/backups"))).toHaveLength(2);
		expect(fs.existsSync(profileIn(home))).toBe(true);
	});
});
