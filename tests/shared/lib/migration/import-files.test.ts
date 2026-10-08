import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { appFolders, nodeFolders } from "../../../platform/node-folders";

import { makeHome, makeProfile, write } from "./profile-fixture";

const nodeExecFile = promisify(execFile);
let home = "";

vi.mock("@chain/sdk", () => ({ desktop: { folders: nodeFolders } }));

vi.mock("@/platform/exec", () => ({
	environmentVariable: async (name: string) => (name === "HOME" ? home : null),
	execFile: (command: string, args: string[], options: { maxBuffer?: number } = {}) =>
		nodeExecFile(command, args, { ...options, encoding: "utf8" }),
}));

const { backupElectronProfile } = await import("@/shared/lib/migration/electron-profile");
const { importElectronFiles } = await import("@/shared/lib/migration/import-files");
const { listCustomAgents } = await import("@/shared/lib/agents/custom-agents-store");

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

async function backupWithSecrets() {
	const profile = makeProfile(home);
	write(profile, "api-studio-environments.json", JSON.stringify({ "/Users/dev/shop": { local: { TOKEN: "s3cret" } } }));

	return (await backupElectronProfile()).folder;
}

const outcomes = (report: Awaited<ReturnType<typeof importElectronFiles>>) =>
	Object.fromEntries(report.stores.filter((store) => store.outcome !== "absent").map((store) => [store.name, store.outcome]));

describe("importElectronFiles", () => {
	it("copies valid stores and user folders, skips broken JSON, and holds secrets back", async () => {
		const backup = await backupWithSecrets();

		const report = await importElectronFiles(backup);

		expect(outcomes(report)).toEqual({
			"custom-agents.json": "imported",
			"agent-autopilot.json": "imported",
			"window-zoom.json": "invalid",
			"api-studio-environments.json": "held",
		});
		expect(report.folders).toEqual([
			{ name: "imported-templates", imported: 2, kept: 0 },
			{ name: "api-studio-responses", imported: 1, kept: 0 },
			{ name: "api-studio-collection-bodies", imported: 0, kept: 0 },
			{ name: "api-studio-downloads", imported: 0, kept: 0 },
		]);
		expect(fs.readFileSync(path.join(appFolders.data, "imported-templates/shop/files/src/index.ts"), "utf8")).toBe(
			"export {};\n",
		);
		expect(fs.existsSync(path.join(appFolders.data, "api-studio-environments.json"))).toBe(false);
		expect(fs.existsSync(path.join(appFolders.data, "Local Storage"))).toBe(false);
	});

	it("leaves the imported custom agents readable by the agents feature", async () => {
		await importElectronFiles(await backupWithSecrets());

		await expect(listCustomAgents()).resolves.toEqual([{ id: "custom-aider", label: "Aider", command: "aider" }]);
	});

	it("keeps what the Chain app already has, and adds nothing the second time", async () => {
		const backup = await backupWithSecrets();
		write(appFolders.data, "custom-agents.json", JSON.stringify([{ id: "custom-mine", label: "Mine", command: "mine" }]));
		await importElectronFiles(backup);

		const again = await importElectronFiles(backup);

		expect(outcomes(again)).toMatchObject({ "custom-agents.json": "kept", "agent-autopilot.json": "kept" });
		expect(again.folders[0]).toEqual({ name: "imported-templates", imported: 0, kept: 2 });
		await expect(listCustomAgents()).resolves.toEqual([{ id: "custom-mine", label: "Mine", command: "mine" }]);
	});
});
