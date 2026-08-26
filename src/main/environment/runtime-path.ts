import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";

import { javaBinDirs, javaHomeOf } from "./java-path";

let normalized = false;

/**
 * SonarLint will not start without a JRE, and finds one through PATH and
 * JAVA_HOME — neither of which a desktop app inherits the way a shell does.
 * Unlike the rest of this file, this matters on Windows too.
 */
function applyJavaEnvironment(): void {
	const binDirs = javaBinDirs();

	if (binDirs.length === 0) {
		return;
	}

	const currentPaths = (process.env.PATH ?? "").split(path.delimiter);

	// Ahead of the existing entries, because the newest runtime is first and a
	// machine with several should not be judged by whichever came earliest.
	process.env.PATH = [...binDirs, ...currentPaths]
		.filter((entry, index, entries) => entry && entries.indexOf(entry) === index)
		.join(path.delimiter);

	process.env.JAVA_HOME ??= javaHomeOf(binDirs[0]);
}

function readShellPath(): string[] {
	if (process.platform === "win32") {
		return [];
	}

	const shell = process.env.SHELL || (process.platform === "darwin" ? "/bin/zsh" : "/bin/bash");
	const result = spawnSync(shell, ["-lic", 'printf "\\nLAZIFY_PATH:%s\\n" "$PATH"'], {
		encoding: "utf8",
		timeout: 4000,
	});

	const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
	const match = output.match(/LAZIFY_PATH:(.+)/);
	return match?.[1] ? match[1].split(path.delimiter) : [];
}

export function normalizeRuntimePath(): void {
	if (normalized) {
		return;
	}

	normalized = true;

	applyJavaEnvironment();

	if (process.platform === "win32") {
		return;
	}

	const home = homedir();
	const commonPaths = [
		"/opt/homebrew/bin",
		"/opt/homebrew/sbin",
		"/usr/local/bin",
		"/usr/local/sbin",
		"/usr/local/share/dotnet",
		path.join(home, ".dotnet", "tools"),
		// Where a per-user install lands on Linux and increasingly on macOS: pipx,
		// `pip install --user`, rustup, bun, and Cursor's own installer — which
		// Lazify itself offers, and would then fail to find.
		path.join(home, ".local", "bin"),
		path.join(home, ".cargo", "bin"),
		path.join(home, ".bun", "bin"),
		"/snap/bin",
		"/usr/bin",
		"/bin",
		"/usr/sbin",
		"/sbin",
	];
	const currentPaths = (process.env.PATH ?? "").split(path.delimiter);
	const mergedPaths = [...readShellPath(), ...commonPaths, ...currentPaths].filter(
		(entry, index, entries) => entry && entries.indexOf(entry) === index,
	);

	process.env.PATH = mergedPaths.join(path.delimiter);
	process.env.DOTNET_ROOT ??= "/usr/local/share/dotnet";
}
