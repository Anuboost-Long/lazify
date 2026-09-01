import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { pruneInstanceDirs } from "../../../src/main/agents/instance-dirs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-instance-dirs-"));

const DEAD_PID = 999_999;

function makeDir(name: string) {
	const dir = path.join(root, name);

	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(path.join(dir, "lint.cjs"), "");

	return dir;
}

const remaining = () => fs.readdirSync(root).sort();

beforeEach(() => {
	fs.rmSync(root, { recursive: true, force: true });
	fs.mkdirSync(root, { recursive: true });
});

afterEach(() => {
	fs.rmSync(root, { recursive: true, force: true });
});

describe("pruneInstanceDirs", () => {
	it("takes this instance's own directories and the ones dead runs left", () => {
		makeDir(`claude-1-${process.pid}`);
		makeDir(`codex-2-${DEAD_PID}`);

		pruneInstanceDirs(root, (name) => Number(name.split("-").at(-1)));

		expect(remaining()).toEqual([]);
	});

	it("leaves another running Lazify's sessions where they are", () => {
		makeDir(`codex-3-${process.ppid}`);
		makeDir(`codex-4-${DEAD_PID}`);

		pruneInstanceDirs(root, (name) => Number(name.split("-").at(-1)));

		expect(remaining()).toEqual([`codex-3-${process.ppid}`]);
	});

	it("takes a directory whose name names no process at all", () => {
		makeDir("myproject-8f3c1a");

		pruneInstanceDirs(root, Number);

		expect(remaining()).toEqual([]);
	});
});
