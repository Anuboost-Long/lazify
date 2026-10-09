import nodeFs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { nodeFolders } from "./node-folders";

vi.mock("@chain/sdk", () => ({ desktop: { folders: nodeFolders } }));

const fs = (await import("@/platform/fs")).default;

let folder: string;

beforeEach(async () => {
	folder = await nodeFs.mkdtemp(path.join(os.tmpdir(), "lazify-fs-"));
});

afterEach(async () => {
	await nodeFs.rm(folder, { recursive: true, force: true });
});

describe("writeFile with wx", () => {
	it("creates a missing file and leaves nothing else behind", async () => {
		await fs.writeFile(path.join(folder, ".env"), "A=1", { encoding: "utf8", flag: "wx" });

		expect(await nodeFs.readdir(folder)).toEqual([".env"]);
		expect(await nodeFs.readFile(path.join(folder, ".env"), "utf8")).toBe("A=1");
	});

	it("fails with EEXIST on an existing file, keeping its text and no staging file", async () => {
		await nodeFs.writeFile(path.join(folder, ".env"), "KEEP=1");

		await expect(fs.writeFile(path.join(folder, ".env"), "", { encoding: "utf8", flag: "wx" })).rejects.toMatchObject({
			code: "EEXIST",
		});
		expect(await nodeFs.readdir(folder)).toEqual([".env"]);
		expect(await nodeFs.readFile(path.join(folder, ".env"), "utf8")).toBe("KEEP=1");
	});
});
