import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { findJavaRuntime, forgetJavaRuntime } from "../../../src/main/extensions/java-runtime";

const originalJavaHome = process.env.JAVA_HOME;
const originalJdkHome = process.env.JDK_HOME;

/** A stand-in `java` that answers `-version` the way a real one does. */
function fakeJavaHome(versionLine: string): string {
	const home = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-java-"));
	const binary = path.join(home, "bin", "java");

	fs.mkdirSync(path.dirname(binary), { recursive: true });
	// Real launchers write the banner to stderr, which is what the resolver reads.
	fs.writeFileSync(binary, `#!/bin/sh\necho '${versionLine}' 1>&2\n`, { mode: 0o755 });

	return home;
}

beforeEach(() => {
	delete process.env.JDK_HOME;
	forgetJavaRuntime();
});

afterEach(() => {
	if (originalJavaHome === undefined) delete process.env.JAVA_HOME;
	else process.env.JAVA_HOME = originalJavaHome;

	if (originalJdkHome === undefined) delete process.env.JDK_HOME;
	else process.env.JDK_HOME = originalJdkHome;

	forgetJavaRuntime();
});

describe("findJavaRuntime", () => {
	it("takes the runtime JAVA_HOME points at when it is new enough", () => {
		process.env.JAVA_HOME = fakeJavaHome('openjdk version "21.0.4" 2024-07-16');

		expect(findJavaRuntime(21, true)).toEqual({
			path: path.join(process.env.JAVA_HOME, "bin", "java"),
			major: 21,
		});
	});

	it("passes over a runtime that is too old rather than launching against it", () => {
		process.env.JAVA_HOME = fakeJavaHome('openjdk version "17.0.13" 2024-10-15 LTS');

		expect(findJavaRuntime(21, true)).toBeNull();
	});

	it("reads Java 8's older 1.x banner as version 8", () => {
		process.env.JAVA_HOME = fakeJavaHome('openjdk version "1.8.0_302"');

		expect(findJavaRuntime(8, true)?.major).toBe(8);
		expect(findJavaRuntime(21, true)).toBeNull();
	});

	it("finds nothing at all for a version no runtime has", () => {
		expect(findJavaRuntime(999, true)).toBeNull();
	});

	it("answers from cache until told to look again", () => {
		process.env.JAVA_HOME = fakeJavaHome('openjdk version "21.0.4" 2024-07-16');
		expect(findJavaRuntime(21, true)?.major).toBe(21);

		process.env.JAVA_HOME = fakeJavaHome('openjdk version "11.0.24" 2024-07-16');
		expect(findJavaRuntime(21)?.major).toBe(21);

		forgetJavaRuntime();
		expect(findJavaRuntime(21)).toBeNull();
	});

	it("ignores a JAVA_HOME pointing at nothing", () => {
		process.env.JAVA_HOME = path.join(os.tmpdir(), "lazify-java-absent");

		expect(() => findJavaRuntime(21, true)).not.toThrow();
	});
});
