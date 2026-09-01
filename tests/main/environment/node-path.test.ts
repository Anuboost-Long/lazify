import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const home = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-node-path-"));
const binDir = path.join(home, "bin");
const NODE_BINARY = process.platform === "win32" ? "node.exe" : "node";
const installedNode = path.join(binDir, NODE_BINARY);

vi.mock("node:os", async (importOriginal) => ({
	...(await importOriginal<typeof import("node:os")>()),
	homedir: () => home,
}));

// A login shell for its PATH is what this module is being kept away from.
vi.mock("../../../src/main/environment/runtime-path", () => ({
	normalizeRuntimePath: () => undefined,
}));

vi.mock("node:child_process", () => ({
	execFileSync: (file: string) => {
		if (file === installedNode) return "20.11.0\n";

		throw new Error(`not node: ${file}`);
	},
}));

const { findNodeBinary, forgetNodeBinary } =
	await import("../../../src/main/environment/node-path");

const originalPath = process.env.PATH;

beforeEach(() => {
	forgetNodeBinary();
	fs.rmSync(binDir, { recursive: true, force: true });
	fs.mkdirSync(binDir, { recursive: true });
});

afterEach(() => {
	process.env.PATH = originalPath;
	fs.rmSync(binDir, { recursive: true, force: true });
});

describe("findNodeBinary", () => {
	it("answers with the node the user's own PATH resolves", () => {
		fs.writeFileSync(installedNode, "", { mode: 0o755 });
		process.env.PATH = binDir;

		expect(findNodeBinary()).toBe(installedNode);
	});

	it("never answers with the Electron binary it is running inside", () => {
		process.env.PATH = path.dirname(process.execPath);

		expect(findNodeBinary()).not.toBe(process.execPath);
	});

	it("answers nothing rather than a path that cannot run as node", () => {
		process.env.PATH = binDir;

		expect(findNodeBinary()).toBeNull();
	});
});
