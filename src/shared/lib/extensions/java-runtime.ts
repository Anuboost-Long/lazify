import { environmentVariable, execFile, ExecFileError, existingFiles } from "@/platform/exec";
import path from "@/shared/lib/path";

import { host } from "../environment/host";
import { javaBinDirs } from "../environment/java-path";

export interface JavaRuntime {
	path: string;
	major: number;
}

const VERSION_PROBE = /version "(\d+)(?:\.(\d+))?/;

const PROBE_TIMEOUT_MS = 4_000;

/** Every launcher prints its banner on stderr, so both streams are read. */
async function majorOf(javaPath: string): Promise<number | null> {
	try {
		const { stdout, stderr } = await execFile(javaPath, ["-version"], { timeout: PROBE_TIMEOUT_MS });
		return readMajor(`${stderr}${stdout}`);
	} catch (error) {
		// A launcher that ran and failed still printed what it is; one that never started, or hung, did not.
		if (error instanceof ExecFileError && !error.killed) return readMajor(`${error.stderr}${error.stdout}`);
		return null;
	}
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
async function candidates(): Promise<string[]> {
	const installed = await javaBinDirs();
	const binary = host.platform === "win32" ? "java.exe" : "java";
	const homes = await Promise.all([environmentVariable("JAVA_HOME"), environmentVariable("JDK_HOME")]);
	const fromEnv = homes
		.filter((home): home is string => Boolean(home))
		.map((home) => path.join(home, "bin", binary));

	return [...fromEnv, ...installed.map((dir) => path.join(dir, binary)), binary];
}

async function probeRuntimes(minimumMajor: number): Promise<JavaRuntime | null> {
	const all = await candidates();
	const present = await existingFiles(all.filter((candidate) => path.isAbsolute(candidate)));

	for (const candidate of all) {
		if (path.isAbsolute(candidate) && !present.has(candidate)) continue;

		const major = await majorOf(candidate);

		if (major !== null && major >= minimumMajor) return { path: candidate, major };
	}

	return null;
}

let cached: { minimumMajor: number; runtime: Promise<JavaRuntime | null> } | null = null;

export function findJavaRuntime(minimumMajor: number, refresh = false): Promise<JavaRuntime | null> {
	if (!refresh && cached?.minimumMajor === minimumMajor) return cached.runtime;

	cached = { minimumMajor, runtime: probeRuntimes(minimumMajor) };

	return cached.runtime;
}

export const forgetJavaRuntime = () => {
	cached = null;
};
