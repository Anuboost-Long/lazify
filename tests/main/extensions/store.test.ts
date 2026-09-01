import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const userData = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-ext-store-"));

vi.mock("electron", () => ({ app: { getPath: () => userData } }));

const {
	forgetInstall,
	installedExtension,
	installedExtensions,
	rememberInstall,
	setExtensionEnabled,
} = await import("../../../src/main/extensions/store");

const ID = "bradlc.vscode-tailwindcss";

beforeEach(() => {
	fs.rmSync(path.join(userData, "extensions"), { recursive: true, force: true });
});

describe("extension store", () => {
	it("has no record of an extension before it is installed", () => {
		expect(installedExtension(ID)).toBeNull();
		expect(installedExtensions()).toEqual({});
	});

	it("records a version and starts the extension switched on", () => {
		const entry = rememberInstall(ID, "0.16.0");

		expect(entry.version).toBe("0.16.0");
		expect(entry.enabled).toBe(true);
		expect(installedExtension(ID)?.version).toBe("0.16.0");
	});

	it("keeps a switched-off extension off across an update", () => {
		rememberInstall(ID, "0.16.0");
		setExtensionEnabled(ID, false);

		expect(rememberInstall(ID, "0.17.0").enabled).toBe(false);
		expect(installedExtension(ID)?.version).toBe("0.17.0");
	});

	it("will not switch on something that was never installed", () => {
		expect(setExtensionEnabled(ID, true)).toBeNull();
	});

	it("forgets an extension once it is removed", () => {
		rememberInstall(ID, "0.16.0");
		forgetInstall(ID);

		expect(installedExtension(ID)).toBeNull();
	});

	it("survives a corrupt record rather than taking the app down with it", () => {
		const recordPath = path.join(userData, "extensions", "installed.json");

		fs.mkdirSync(path.dirname(recordPath), { recursive: true });
		fs.writeFileSync(recordPath, "{ not json");

		expect(installedExtensions()).toEqual({});
	});
});
