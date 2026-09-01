import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

import { normalizeRuntimePath } from "./runtime-path";

const PROBE_TIMEOUT_MS = 4_000;

const NODE_BINARY = process.platform === "win32" ? "node.exe" : "node";

function nvmBinDirs(): string[] {
	const versions = path.join(homedir(), ".nvm", "versions", "node");

	try {
		return fs
			.readdirSync(versions)
			.sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))
			.map((version) => path.join(versions, version, "bin"));
	} catch {
		return [];
	}
}

function commonBinDirs(): string[] {
	if (process.platform === "win32") {
		return [path.join(process.env.ProgramFiles ?? String.raw`C:\Program Files`, "nodejs")];
	}

	return ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin"];
}

function runsAsNode(candidate: string): boolean {
	try {
		const reported = execFileSync(candidate, ["-p", "process.versions.node"], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
			timeout: PROBE_TIMEOUT_MS,
		}).trim();

		return /^\d+\./.test(reported);
	} catch {
		return false;
	}
}

let resolved: string | null = null;

export function findNodeBinary(): string | null {
	if (resolved && fs.existsSync(resolved)) return resolved;

	normalizeRuntimePath();

	const searched = [
		...(process.env.PATH ?? "").split(path.delimiter),
		...nvmBinDirs(),
		...commonBinDirs(),
	];

	const candidates = [...new Set(searched)]
		.filter(Boolean)
		.map((dir) => path.join(dir, NODE_BINARY))
		.filter((file) => file !== process.execPath && fs.existsSync(file));

	resolved = candidates.find(runsAsNode) ?? null;

	return resolved;
}

export function forgetNodeBinary(): void {
	resolved = null;
}
