import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { extractVsix } from "../../../src/main/extensions/archive";
import { storedZip } from "./stored-zip";

const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "lazify-vsix-"));

describe("extractVsix", () => {
	it("unpacks the extension tree so the server entry lands where the provider expects it", async () => {
		const target = path.join(tempDir(), "0.1.0");

		await extractVsix(
			storedZip({
				"extension/package.json": '{"name":"probe"}',
				"extension/dist/server.js": "process.exit(0);",
			}),
			target,
		);

		expect(fs.existsSync(path.join(target, "extension", "dist", "server.js"))).toBe(true);
		expect(fs.readFileSync(path.join(target, "extension", "package.json"), "utf8")).toBe(
			'{"name":"probe"}',
		);
	});

	it("replaces what was there, so an update never leaves the old version behind", async () => {
		const target = path.join(tempDir(), "0.1.0");

		fs.mkdirSync(target, { recursive: true });
		fs.writeFileSync(path.join(target, "stale.txt"), "old");

		await extractVsix(storedZip({ "extension/package.json": "{}" }), target);

		expect(fs.existsSync(path.join(target, "stale.txt"))).toBe(false);
		expect(fs.existsSync(path.join(target, "extension", "package.json"))).toBe(true);
	});

	it("drops entries that would climb out of the target directory", async () => {
		const parent = tempDir();
		const target = path.join(parent, "0.1.0");
		const escapee = path.join(parent, "escaped.txt");

		await extractVsix(
			storedZip({
				"../escaped.txt": "owned",
				"extension/package.json": "{}",
			}),
			target,
		);

		expect(fs.existsSync(escapee)).toBe(false);
		expect(fs.existsSync(path.join(target, "extension", "package.json"))).toBe(true);
	});
});
