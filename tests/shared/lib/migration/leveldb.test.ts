import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { decodeLocalStorage, lazifyItems, storedProjects } from "@/shared/lib/migration/electron-local-storage";
import { readLevelDb, readLogFile, readTableFile, snappyDecompress } from "@/shared/lib/migration/leveldb";

const fixture = path.join(import.meta.dirname, "fixtures/chrome-local-storage");
const files = fs
	.readdirSync(path.join(fixture, "leveldb"))
	.map((name) => ({ name, bytes: new Uint8Array(fs.readFileSync(path.join(fixture, "leveldb", name))) }));
const expected = JSON.parse(fs.readFileSync(path.join(fixture, "expected.json"), "utf8"));

const file = (suffix: string) => files.find((entry) => entry.name.endsWith(suffix))!;
const text = (bytes: Uint8Array) => new TextDecoder("latin1").decode(bytes);

describe("LevelDB written by a real Chrome", () => {
	it("reads back exactly the localStorage items the page wrote", () => {
		expect(lazifyItems(decodeLocalStorage(readLevelDb(files)))).toEqual(expected);
	});

	it("has older values in a Snappy-compressed table that the newer log overrides", () => {
		const bytes = file(".ldb").bytes;
		const footer = bytes.subarray(-48);
		const varints: number[] = [];
		for (let at = 0, value = 0, shift = 0; varints.length < 4; at += 1) {
			value += (footer[at] & 0x7f) * 2 ** shift;
			shift += 7;
			if (footer[at] < 0x80) {
				varints.push(value);
				value = 0;
				shift = 0;
			}
		}
		expect(bytes[varints[2] + varints[3]]).toBe(1);

		const table = readTableFile(bytes);
		const keys = table.map((entry) => text(entry.key));

		expect(keys.some((key) => key.endsWith("bulk-0"))).toBe(true);
		const theme = table.find((entry) => text(entry.key).endsWith("lazify-theme"));
		expect(text(theme!.value!)).toBe("\u0001light");
		expect(keys.some((key) => key.endsWith("lazify-removed"))).toBe(true);

		const log = readLogFile(file(".log").bytes);
		expect(log.some((entry) => text(entry.key).endsWith("lazify-removed") && entry.value === null)).toBe(true);
		expect(Math.min(...log.map((entry) => entry.sequence))).toBeGreaterThan(
			Math.max(...table.map((entry) => entry.sequence)),
		);
	});

	it("decodes a UTF-16 value as well as Latin-1 ones", () => {
		const items = lazifyItems(decodeLocalStorage(readLevelDb(files)));

		expect(items["lazify-note"]).toBe("Ünïcödé café — ✓");
		expect(storedProjects(items)).toEqual([
			{ path: "/Users/dev/Work/shop", name: "shop" },
			{ path: "/Users/dev/Work/日本語-app", name: "日本語-app" },
		]);
	});

	it("ignores a torn record at the end of a log, as LevelDB does after a crash", () => {
		const log = file(".log").bytes;
		const torn = log.slice(0, log.length - 5);

		const items = lazifyItems(decodeLocalStorage(readLevelDb([file(".ldb"), { name: "000004.log", bytes: torn }])));

		expect(items["lazify-theme"]).toBeDefined();
	});

	it("rejects a corrupted Snappy stream instead of returning garbage", () => {
		expect(() => snappyDecompress(new Uint8Array([10, 0x0d, 0x01]))).toThrow();
	});
});
