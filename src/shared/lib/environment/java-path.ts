import { environmentVariable, execFile, existingFiles } from "@/platform/exec";
import path from "@/shared/lib/path";

import { host, prepareHost } from "./host";

/**
 * Where Java runtimes live when nothing put them on PATH: the system's own
 * JavaVirtualMachines, Homebrew, and the version managers. SonarLint needs one,
 * and a desktop app does not inherit a shell's JAVA_HOME.
 */

const PROBE_TIMEOUT_MS = 4_000;

const javaBinary = () => (host.platform === "win32" ? "java.exe" : "java");

async function runtimeParents(): Promise<string[]> {
	const home = host.homedir;

	if (host.platform === "win32") {
		const programFiles = (await environmentVariable("ProgramFiles")) ?? String.raw`C:\Program Files`;
		const localAppData = (await environmentVariable("LOCALAPPDATA")) ?? path.join(home, "AppData", "Local");

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

	if (host.platform === "darwin") {
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

function binDirsUnder(runtime: string): string[] {
	return [path.join(runtime, "bin"), path.join(runtime, "Contents", "Home", "bin")];
}

/** The entries of each folder that exists, in one process; folders outside every grant included. */
async function childrenOf(folders: string[]): Promise<Map<string, string[]>> {
	const children = new Map<string, string[]>();
	if (folders.length === 0) return children;

	const script = 'for d; do for e in "$d"/* "$d"/.[!.]*; do [ -e "$e" ] && printf "%s\\n" "$e"; done; done; exit 0';
	const { stdout } = await execFile("/bin/sh", ["-c", script, "sh", ...folders]).catch(() => ({ stdout: "" }));

	for (const entry of stdout.split("\n").filter(Boolean)) {
		const parent = path.dirname(entry);
		children.set(parent, [...(children.get(parent) ?? []), path.basename(entry)]);
	}

	return children;
}

async function homebrewLinks(): Promise<string[]> {
	if (host.platform === "win32") return [];

	const prefixes = ["/opt/homebrew/opt", "/usr/local/opt"];
	const children = await childrenOf(prefixes);

	return prefixes.flatMap((prefix) =>
		(children.get(prefix) ?? [])
			.filter((entry) => entry.startsWith("openjdk"))
			.map((entry) => path.join(prefix, entry, "bin")),
	);
}

async function macOsDefault(): Promise<string[]> {
	if (host.platform !== "darwin") return [];

	try {
		const { stdout } = await execFile("/usr/libexec/java_home", [], { timeout: PROBE_TIMEOUT_MS });
		const home = stdout.trim();

		return home ? [path.join(home, "bin")] : [];
	} catch {
		return [];
	}
}

function versionRank(name: string): number {
	const matched = /(\d+)(?:\.(\d+))?/.exec(name);

	if (!matched) return 0;

	const first = Number(matched[1]);

	return first === 1 ? Number(matched[2] ?? 0) : first;
}

function rankOf(binDir: string): number {
	const runtime = path.dirname(binDir);
	const bundled = runtime.endsWith(path.join("Contents", "Home"));

	return versionRank(path.basename(bundled ? path.dirname(path.dirname(runtime)) : runtime));
}

export async function javaBinDirs(): Promise<string[]> {
	await prepareHost();

	const parents = await runtimeParents();
	const children = await childrenOf(parents);
	const scanned = parents.flatMap((parent) =>
		(children.get(parent) ?? []).flatMap((entry) => binDirsUnder(path.join(parent, entry))),
	);
	const discovered = [...(await homebrewLinks()), ...scanned].sort((left, right) => rankOf(right) - rankOf(left));

	// What macOS itself nominates leads, whatever the version numbers say: it is
	// the runtime the rest of the machine already builds against.
	const found = [...new Set([...(await macOsDefault()), ...discovered])];
	const present = await existingFiles(found.map((dir) => path.join(dir, javaBinary())));

	return found.filter((dir) => present.has(path.join(dir, javaBinary())));
}

export const javaHomeOf = (binDir: string) => path.dirname(binDir);
