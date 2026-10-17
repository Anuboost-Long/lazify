import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { nodeFolders } from "../../../platform/node-folders";

// Lazify Chain reaches the disk through the platform layer; these run it on Node.
vi.mock("@chain/sdk", () => ({ desktop: { folders: nodeFolders } }));
vi.mock("@/platform/exec", () => import("../../../platform/node-exec"));

const { ensureLazifyDirectory } = await import("@/shared/lib/projects/lazify-directory");

/**
 * The ignore entry is written into a folder the user owns, so what matters is
 * that it lands once, leaves an existing file intact, and stays out of folders
 * that are not under version control.
 */

let projectPath = "";

const ignoreFile = () => path.join(projectPath, ".gitignore");
const ensure = () => ensureLazifyDirectory(projectPath, path.join(projectPath, ".lazify"));

beforeEach(() => {
	projectPath = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-directory-"));
	fs.mkdirSync(path.join(projectPath, ".git"));
});

afterEach(() => {
	fs.rmSync(projectPath, { recursive: true, force: true });
});

describe("ensureLazifyDirectory", () => {
	it("creates the directory and ignores it", async () => {
		await ensure();

		expect(fs.existsSync(path.join(projectPath, ".lazify"))).toBe(true);
		expect(fs.readFileSync(ignoreFile(), "utf8")).toBe(".lazify/\n");
	});

	it("keeps what the ignore file already says and adds the entry once", async () => {
		fs.writeFileSync(ignoreFile(), "node_modules/\ndist/");

		await ensure();
		await ensure();

		expect(fs.readFileSync(ignoreFile(), "utf8")).toBe("node_modules/\ndist/\n.lazify/\n");
	});

	it("leaves an entry written in another form alone", async () => {
		fs.writeFileSync(ignoreFile(), "/.lazify\n");

		await ensure();

		expect(fs.readFileSync(ignoreFile(), "utf8")).toBe("/.lazify\n");
	});

	it("writes no ignore file outside a repository", async () => {
		fs.rmSync(path.join(projectPath, ".git"), { recursive: true });

		await ensure();

		expect(fs.existsSync(path.join(projectPath, ".lazify"))).toBe(true);
		expect(fs.existsSync(ignoreFile())).toBe(false);
	});
});
