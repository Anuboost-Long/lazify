import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { javaBinDirs } from "../environment/java-path";

export interface JavaRuntime {
	path: string;
	major: number;
}

const VERSION_PROBE = /version "(\d+)(?:\.(\d+))?/;

const PROBE_TIMEOUT_MS = 4_000;

/** Every launcher prints its banner on stderr, so both streams are read. */
function majorOf(javaPath: string): number | null {
	const probe = spawnSync(javaPath, ["-version"], {
		encoding: "utf8",
		timeout: PROBE_TIMEOUT_MS,
	});

	if (probe.error) return null;

	return readMajor(`${probe.stderr ?? ""}${probe.stdout ?? ""}`);
}

function readMajor(output: string): number | null {
	const matched = VERSION_PROBE.exec(output);

	if (!matched) return null;

	const first = Number(matched[1]);

	// Java 8 and earlier report "1.8.0_302"; everything since reports "21.0.1".
	return first === 1 ? Number(matched[2] ?? 0) : first;
}

/**
 * Where to look, in the order worth looking. What the user pointed at comes
 * first, then every runtime actually installed — newest first, so a machine
 * carrying both an old and a new JDK is not judged by the old one — and finally
 * the bare name, for a runtime somewhere none of this thought to look.
 */
function candidates(): string[] {
	const binary = process.platform === "win32" ? "java.exe" : "java";
	const fromEnv = [process.env.JAVA_HOME, process.env.JDK_HOME]
		.filter((home): home is string => Boolean(home))
		.map((home) => path.join(home, "bin", binary));

	const installed = javaBinDirs().map((dir) => path.join(dir, binary));

	return [...fromEnv, ...installed, binary];
}

let cached: { minimumMajor: number; runtime: JavaRuntime | null } | null = null;

export function findJavaRuntime(minimumMajor: number, refresh = false): JavaRuntime | null {
	if (!refresh && cached?.minimumMajor === minimumMajor) return cached.runtime;

	let runtime: JavaRuntime | null = null;

	for (const candidate of candidates()) {
		if (path.isAbsolute(candidate) && !fs.existsSync(candidate)) continue;

		const major = majorOf(candidate);

		if (major !== null && major >= minimumMajor) {
			runtime = { path: candidate, major };
			break;
		}
	}

	cached = { minimumMajor, runtime };

	return runtime;
}

export const forgetJavaRuntime = () => {
	cached = null;
};
