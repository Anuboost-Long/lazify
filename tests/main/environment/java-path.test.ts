import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const home = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-java-home-"));

// The machine's own runtimes are not the subject here, and macOS would nominate
// one of them ahead of everything this test installs.
vi.mock("node:child_process", () => ({
	execFileSync: () => {
		throw new Error("no java_home");
	},
}));

vi.mock("node:os", async (importOriginal) => ({
	...(await importOriginal<typeof import("node:os")>()),
	homedir: () => home,
}));

const { javaBinDirs, javaHomeOf } = await import("../../../src/main/environment/java-path");

/** A runtime as SDKMAN lays one out: a version folder with a launcher in it. */
function installRuntime(version: string, withBinary = true) {
	const binDir = path.join(home, ".sdkman", "candidates", "java", version, "bin");

	fs.mkdirSync(binDir, { recursive: true });

	if (withBinary) fs.writeFileSync(path.join(binDir, "java"), "", { mode: 0o755 });

	return binDir;
}

/**
 * Only the runtimes this test installed. The machine running it has its own,
 * which are found too and would otherwise decide every assertion.
 */
const installed = () => javaBinDirs().filter((dir) => dir.startsWith(home));

beforeEach(() => {
	fs.rmSync(path.join(home, ".sdkman"), { recursive: true, force: true });
});

afterEach(() => {
	fs.rmSync(path.join(home, ".sdkman"), { recursive: true, force: true });
});

describe("javaBinDirs", () => {
	it("finds a runtime an installer left outside JAVA_HOME", () => {
		const binDir = installRuntime("21.0.4-tem");

		expect(javaBinDirs()).toContain(binDir);
	});

	it("puts the newest first, so an old runtime is not asked first", () => {
		installRuntime("11.0.24-tem");
		const newest = installRuntime("21.0.4-tem");
		installRuntime("17.0.13-tem");

		expect(installed()[0]).toBe(newest);
	});

	it("reads Java 8's older 1.x naming as 8 rather than 1", () => {
		const eight = installRuntime("1.8.0_302-tem");
		installRuntime("11.0.24-tem");

		expect(installed()[1]).toBe(eight);
	});

	it("passes over a directory with no launcher in it", () => {
		const empty = installRuntime("21.0.4-tem", false);

		expect(javaBinDirs()).not.toContain(empty);
	});

	it("answers nothing rather than throwing when no runtime is installed", () => {
		expect(installed()).toEqual([]);
	});
});

describe("javaHomeOf", () => {
	it("names the runtime holding a launcher directory", () => {
		expect(javaHomeOf("/opt/java/jdk-21/bin")).toBe("/opt/java/jdk-21");
	});
});
