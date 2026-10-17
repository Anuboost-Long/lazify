import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Electron's java-path cases, on Lazify Chain's async module. The platform layer
 * runs on Node here: real folders and a real shell, with HOME pointed at the
 * test's own tree.
 */

const home = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-java-home-"));

vi.mock("@/platform/exec", async () => {
	const node = await import("../../../platform/node-exec");

	return {
		...node,
		// The machine's own runtimes are not the subject here, and macOS would
		// nominate one of them ahead of everything this test installs.
		execFile: (command: string, args: string[], options?: { timeout?: number }) =>
			command === "/usr/libexec/java_home" ? Promise.reject(new Error("no java_home")) : node.execFile(command, args, options),
		environmentVariable: async (name: string) => (name === "HOME" ? home : null),
		currentOs: async () => "macos",
		currentArch: async () => "arm64",
	};
});

const { javaBinDirs, javaHomeOf } = await import("@/shared/lib/environment/java-path");

/** SDKMAN's candidates: a place every platform but Windows looks. */
const runtimeParent = path.join(home, ".sdkman", "candidates", "java");

/** A runtime as an installer lays one out: a version folder with a launcher in it. */
function installRuntime(version: string, withBinary = true) {
	const binDir = path.join(runtimeParent, version, "bin");

	fs.mkdirSync(binDir, { recursive: true });

	if (withBinary) fs.writeFileSync(path.join(binDir, "java"), "", { mode: 0o755 });

	return binDir;
}

/**
 * Only the runtimes this test installed. The machine running it has its own,
 * which are found too and would otherwise decide every assertion.
 */
const installed = async () => (await javaBinDirs()).filter((dir) => dir.startsWith(home));

beforeEach(() => {
	fs.rmSync(runtimeParent, { recursive: true, force: true });
});

afterEach(() => {
	fs.rmSync(runtimeParent, { recursive: true, force: true });
});

describe("javaBinDirs", () => {
	it("finds a runtime an installer left outside JAVA_HOME", async () => {
		const binDir = installRuntime("21.0.4-tem");

		expect(await javaBinDirs()).toContain(binDir);
	});

	it("puts the newest first, so an old runtime is not asked first", async () => {
		installRuntime("11.0.24-tem");
		const newest = installRuntime("21.0.4-tem");
		installRuntime("17.0.13-tem");

		expect((await installed())[0]).toBe(newest);
	});

	it("reads Java 8's older 1.x naming as 8 rather than 1", async () => {
		const eight = installRuntime("1.8.0_302-tem");
		installRuntime("11.0.24-tem");

		expect((await installed())[1]).toBe(eight);
	});

	it("passes over a directory with no launcher in it", async () => {
		const empty = installRuntime("21.0.4-tem", false);

		expect(await javaBinDirs()).not.toContain(empty);
	});

	it("answers nothing rather than throwing when no runtime is installed", async () => {
		expect(await installed()).toEqual([]);
	});
});

describe("javaHomeOf", () => {
	it("names the runtime holding a launcher directory", () => {
		expect(javaHomeOf("/opt/java/jdk-21/bin")).toBe("/opt/java/jdk-21");
	});
});
