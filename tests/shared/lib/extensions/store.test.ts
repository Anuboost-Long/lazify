import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { nodeFolders } from "../../../platform/node-folders";

/** Electron's extension store cases, on Lazify Chain's async store over the platform layer. */

const userData = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-ext-store-"));

vi.mock("@chain/sdk", () => ({ desktop: { folders: nodeFolders } }));
vi.mock("@/platform/folders", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/platform/folders")>()),
	appDataPath: async () => userData,
}));

const { forgetInstall, installedExtension, installedExtensions, rememberInstall, setExtensionEnabled } = await import(
	"@/shared/lib/extensions/store"
);

const ID = "bradlc.vscode-tailwindcss";

beforeEach(() => {
	fs.rmSync(path.join(userData, "extensions"), { recursive: true, force: true });
});

describe("extension store", () => {
	it("has no record of an extension before it is installed", async () => {
		expect(await installedExtension(ID)).toBeNull();
		expect(await installedExtensions()).toEqual({});
	});

	it("records a version and starts the extension switched on", async () => {
		const entry = await rememberInstall(ID, "0.16.0");

		expect(entry.version).toBe("0.16.0");
		expect(entry.enabled).toBe(true);
		expect((await installedExtension(ID))?.version).toBe("0.16.0");
	});

	it("keeps a switched-off extension off across an update", async () => {
		await rememberInstall(ID, "0.16.0");
		await setExtensionEnabled(ID, false);

		expect((await rememberInstall(ID, "0.17.0")).enabled).toBe(false);
		expect((await installedExtension(ID))?.version).toBe("0.17.0");
	});

	it("will not switch on something that was never installed", async () => {
		expect(await setExtensionEnabled(ID, true)).toBeNull();
	});

	it("forgets an extension once it is removed", async () => {
		await rememberInstall(ID, "0.16.0");
		await forgetInstall(ID);

		expect(await installedExtension(ID)).toBeNull();
	});

	it("survives a corrupt record rather than taking the app down with it", async () => {
		const recordPath = path.join(userData, "extensions", "installed.json");

		fs.mkdirSync(path.dirname(recordPath), { recursive: true });
		fs.writeFileSync(recordPath, "{ not json");

		expect(await installedExtensions()).toEqual({});
	});
});
