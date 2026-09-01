import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

/**
 * Every Java runtime this machine has, wherever it was installed from.
 *
 * SonarLint will not start without one, and a JDK reaches a machine by too many
 * routes for `JAVA_HOME` to be a reliable answer — Homebrew, SDKMAN, asdf, the
 * distribution's own package, Gradle's toolchain downloads, an installer that
 * set nothing at all. So the install locations are read directly.
 *
 * This is discovery, not verification: a directory named `jdk-21` is only a
 * claim, and every candidate is still launched with `-version` before it is
 * believed. Ordering newest-first only decides who gets asked first.
 */

const PROBE_TIMEOUT_MS = 4_000;

const JAVA_BINARY = process.platform === "win32" ? "java.exe" : "java";

/** Directories whose children are each a JVM, rather than JVMs themselves. */
function runtimeParents(): string[] {
	const home = homedir();

	if (process.platform === "win32") {
		const programFiles = process.env.ProgramFiles ?? String.raw`C:\Program Files`;
		const localAppData = process.env.LOCALAPPDATA ?? path.join(home, "AppData", "Local");

		return [
			path.join(programFiles, "Java"),
			path.join(programFiles, "Eclipse Adoptium"),
			path.join(programFiles, "Microsoft"),
			path.join(programFiles, "Amazon Corretto"),
			path.join(localAppData, "Programs", "Eclipse Adoptium"),
		];
	}

	const shared = [
		path.join(home, ".sdkman", "candidates", "java"),
		path.join(home, ".asdf", "installs", "java"),
		path.join(home, ".jenv", "versions"),
		path.join(home, ".gradle", "jdks"),
	];

	if (process.platform === "darwin") {
		return [
			"/Library/Java/JavaVirtualMachines",
			path.join(home, "Library", "Java", "JavaVirtualMachines"),
			"/opt/homebrew/Cellar/openjdk",
			"/usr/local/Cellar/openjdk",
			...shared,
		];
	}

	return ["/usr/lib/jvm", "/usr/java", "/opt/java", ...shared];
}

/**
 * Where the launcher sits under one runtime. macOS buries it inside a bundle;
 * everywhere else it is directly below.
 */
function binDirsUnder(runtime: string): string[] {
	return [path.join(runtime, "bin"), path.join(runtime, "Contents", "Home", "bin")];
}

/** Homebrew's `opt` links, which point at whichever version is current. */
function homebrewLinks(): string[] {
	if (process.platform === "win32") return [];

	return ["/opt/homebrew/opt", "/usr/local/opt"].flatMap((prefix) => {
		try {
			return fs
				.readdirSync(prefix)
				.filter((entry) => entry.startsWith("openjdk"))
				.map((entry) => path.join(prefix, entry, "bin"));
		} catch {
			return [];
		}
	});
}

/** What macOS itself considers installed, which is authoritative when it answers. */
function macOsDefault(): string[] {
	if (process.platform !== "darwin") return [];

	try {
		const home = execFileSync("/usr/libexec/java_home", {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
			timeout: PROBE_TIMEOUT_MS,
		}).trim();

		return home ? [path.join(home, "bin")] : [];
	} catch {
		return [];
	}
}

/**
 * The major version a directory name claims, for ordering only. Java 8 and
 * earlier are named `1.8.0_302`; everything since leads with its major.
 */
function versionRank(name: string): number {
	const matched = /(\d+)(?:\.(\d+))?/.exec(name);

	if (!matched) return 0;

	const first = Number(matched[1]);

	return first === 1 ? Number(matched[2] ?? 0) : first;
}

function scanned(parent: string): string[] {
	try {
		return fs.readdirSync(parent).flatMap((entry) => binDirsUnder(path.join(parent, entry)));
	} catch {
		return [];
	}
}

/**
 * The version a bin directory claims, read from the runtime folder holding it —
 * and only from that folder. Ranking the whole path would let a digit anywhere
 * above it (`/home/dev2`, a temp directory) stand in for a version.
 */
function rankOf(binDir: string): number {
	const runtime = path.dirname(binDir);
	const bundled = runtime.endsWith(path.join("Contents", "Home"));

	return versionRank(path.basename(bundled ? path.dirname(path.dirname(runtime)) : runtime));
}

export function javaBinDirs(): string[] {
	const discovered = [...homebrewLinks(), ...runtimeParents().flatMap(scanned)].sort(
		(left, right) => rankOf(right) - rankOf(left),
	);

	// What macOS itself nominates leads, whatever the version numbers say: it is
	// the runtime the rest of the machine already builds against.
	const found = [...macOsDefault(), ...discovered];

	return [...new Set(found)].filter((dir) => fs.existsSync(path.join(dir, JAVA_BINARY)));
}

/** The `JAVA_HOME` a bin directory implies — the directory above it. */
export const javaHomeOf = (binDir: string) => path.dirname(binDir);
