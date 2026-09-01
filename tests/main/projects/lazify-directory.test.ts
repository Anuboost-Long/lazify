import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ensureLazifyDirectory } from "../../../src/main/projects/lazify-directory";

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
	it("creates the directory and ignores it", () => {
		ensure();

		expect(fs.existsSync(path.join(projectPath, ".lazify"))).toBe(true);
		expect(fs.readFileSync(ignoreFile(), "utf8")).toBe(".lazify/\n");
	});

	it("keeps what the ignore file already says and adds the entry once", () => {
		fs.writeFileSync(ignoreFile(), "node_modules/\ndist/");

		ensure();
		ensure();

		expect(fs.readFileSync(ignoreFile(), "utf8")).toBe("node_modules/\ndist/\n.lazify/\n");
	});

	it("leaves an entry written in another form alone", () => {
		fs.writeFileSync(ignoreFile(), "/.lazify\n");

		ensure();

		expect(fs.readFileSync(ignoreFile(), "utf8")).toBe("/.lazify\n");
	});

	it("writes no ignore file outside a repository", () => {
		fs.rmSync(path.join(projectPath, ".git"), { recursive: true });

		ensure();

		expect(fs.existsSync(path.join(projectPath, ".lazify"))).toBe(true);
		expect(fs.existsSync(ignoreFile())).toBe(false);
	});
});
