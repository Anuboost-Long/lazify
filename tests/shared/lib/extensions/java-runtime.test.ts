import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

/** Electron's java-runtime cases, on Lazify Chain's async resolver over `@/platform/exec`. */

// These cases are about what the resolver does with a runtime it is handed, so
// the machine's own runtimes are kept out of it — otherwise a developer with a
// JDK installed and a CI box without one disagree about every assertion.
vi.mock("@/shared/lib/environment/java-path", () => ({
	javaBinDirs: async () => [],
	javaHomeOf: (binDir: string) => binDir,
}));

/** What each stand-in launcher prints, keyed by the path the resolver runs. */
const banners = new Map<string, string>();
/** The variables the resolver reads: JAVA_HOME and JDK_HOME. */
const env: Record<string, string | undefined> = {};

// Real launchers write their banner to stderr. What is under test is which
// candidate is chosen and how its banner is read, so the run is answered here.
vi.mock("@/platform/exec", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/platform/exec")>()),
	existingFiles: (await import("../../../platform/node-exec")).existingFiles,
	environmentVariable: async (name: string) => env[name] ?? null,
	execFile: async (command: string) => {
		const banner = banners.get(command);
		if (!banner) throw new Error("not a launcher");

		return { stdout: "", stderr: banner };
	},
}));

vi.mock("@chain/sdk", () => ({ desktop: {} }));

const { findJavaRuntime, forgetJavaRuntime } = await import("@/shared/lib/extensions/java-runtime");

/** A stand-in launcher that answers `-version` the way a real one does. */
function fakeJavaHome(versionLine: string): string {
	const home = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-java-"));
	const binary = path.join(home, "bin", "java");

	fs.mkdirSync(path.dirname(binary), { recursive: true });
	fs.writeFileSync(binary, "", { mode: 0o755 });
	banners.set(binary, versionLine);

	return home;
}

beforeEach(() => {
	delete env.JAVA_HOME;
	delete env.JDK_HOME;
	forgetJavaRuntime();
});

describe("findJavaRuntime", () => {
	it("takes the runtime JAVA_HOME points at when it is new enough", async () => {
		env.JAVA_HOME = fakeJavaHome('openjdk version "21.0.4" 2024-07-16');

		expect(await findJavaRuntime(21, true)).toEqual({
			path: path.join(env.JAVA_HOME, "bin", "java"),
			major: 21,
		});
	});

	it("passes over a runtime that is too old rather than launching against it", async () => {
		env.JAVA_HOME = fakeJavaHome('openjdk version "17.0.13" 2024-10-15 LTS');

		expect(await findJavaRuntime(21, true)).toBeNull();
	});

	it("reads Java 8's older 1.x banner as version 8", async () => {
		env.JAVA_HOME = fakeJavaHome('openjdk version "1.8.0_302"');

		expect((await findJavaRuntime(8, true))?.major).toBe(8);
		expect(await findJavaRuntime(21, true)).toBeNull();
	});

	it("finds nothing at all for a version no runtime has", async () => {
		expect(await findJavaRuntime(999, true)).toBeNull();
	});

	it("answers from cache until told to look again", async () => {
		env.JAVA_HOME = fakeJavaHome('openjdk version "21.0.4" 2024-07-16');
		expect((await findJavaRuntime(21, true))?.major).toBe(21);

		env.JAVA_HOME = fakeJavaHome('openjdk version "11.0.24" 2024-07-16');
		expect((await findJavaRuntime(21))?.major).toBe(21);

		forgetJavaRuntime();
		expect(await findJavaRuntime(21)).toBeNull();
	});

	it("ignores a JAVA_HOME pointing at nothing", async () => {
		env.JAVA_HOME = path.join(os.tmpdir(), "lazify-java-absent");

		await expect(findJavaRuntime(21, true)).resolves.toBeNull();
	});
});
