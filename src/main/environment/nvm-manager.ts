import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { loginShell } from "./login-shell";
import type { NvmActionResult } from "./tool-actions";
import { findNvmScript, runWithNvm } from "./tools/nvm-shell";

const execFileAsync = promisify(execFile);

export interface NvmNodeVersion {
	version: string;
	lts: string | null;
	current: boolean;
}

export interface NvmVersionList {
	nvmAvailable: boolean;
	versions: NvmNodeVersion[];
}

export interface NvmInstallResult {
	success: boolean;
	output: string;
	platform: "macos" | "linux" | "windows" | "unknown";
}

const failed = (err: unknown): NvmActionResult => ({
	success: false,
	output: err instanceof Error ? err.message : String(err),
});

export async function listNvmVersions(): Promise<NvmVersionList> {
	if (!findNvmScript()) return { nvmAvailable: false, versions: [] };

	try {
		const { stdout } = await runWithNvm("nvm ls --no-colors", 8000);
		return { nvmAvailable: true, versions: parseNvmLs(stdout ?? "") };
	} catch {
		return { nvmAvailable: true, versions: [] };
	}
}

export async function nvmSetDefault(version: string): Promise<NvmActionResult> {
	if (!findNvmScript()) return { success: false, output: "nvm not found" };

	try {
		const { stdout, stderr } = await runWithNvm(`nvm alias default ${version} --no-colors`, 8000);
		return { success: true, output: [stdout, stderr].filter(Boolean).join("\n").trim() };
	} catch (err) {
		return failed(err);
	}
}

export async function nvmUse(version: string): Promise<NvmActionResult> {
	if (!findNvmScript()) return { success: false, output: "nvm not found" };

	try {
		// Run `nvm use` then print the resulting PATH so we can propagate it to
		// the Electron process — this ensures all subsequent spawn calls inherit
		// the newly selected Node version.
		const { stdout, stderr } = await runWithNvm(
			String.raw`nvm use ${version} --no-colors && printf "\nNVM_NEW_PATH:%s\n" "$PATH"`,
			10000,
		);

		const combined = [stdout, stderr].filter(Boolean).join("\n");

		const pathMatch = /NVM_NEW_PATH:(.+)/.exec(combined);
		if (pathMatch?.[1]) {
			process.env.PATH = pathMatch[1].trim();
		}

		const output = combined.replace(/NVM_NEW_PATH:.+/g, "").trim();
		return { success: true, output };
	} catch (err) {
		return failed(err);
	}
}

export async function installNvm(): Promise<NvmInstallResult> {
	if (process.platform === "win32") {
		return {
			success: false,
			output:
				"Windows detected. Please install nvm-windows manually from https://github.com/coreybutler/nvm-windows",
			platform: "windows",
		};
	}

	const platform = process.platform === "darwin" ? "macos" : "linux";
	const installUrl = "https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh";

	try {
		const { stdout, stderr } = await execFileAsync(...loginShell(`curl -o- "${installUrl}" | bash`), {
			timeout: 90_000,
			maxBuffer: 10 * 1024 * 1024,
		});
		return { success: true, output: [stdout, stderr].filter(Boolean).join("\n").trim(), platform };
	} catch (err) {
		return { ...failed(err), platform };
	}
}

// ---------------------------------------------------------------------------
// NVM version list helpers
// ---------------------------------------------------------------------------

function parseNvmLs(output: string): NvmNodeVersion[] {
	const lines = output.split("\n");

	const ltsMap = new Map<string, string>();
	for (const line of lines) {
		const m = /^\s*lts\/(\w+)\s+->\s+(v\d+\.\d+\.\d+)/i.exec(line);
		if (m) ltsMap.set(m[2], capitalize(m[1]));
	}

	const versions: NvmNodeVersion[] = [];
	const seen = new Set<string>();

	for (const line of lines) {
		const currentMatch = /^->\s+(v\d+\.\d+\.\d+)(?:\s+\(lts\/(\w+)\))?/i.exec(line);
		const normalMatch = !currentMatch
			? /^\s+(v\d+\.\d+\.\d+)(?:\s+\(lts\/(\w+)\))?/i.exec(line)
			: null;
		const match = currentMatch ?? normalMatch;
		if (!match) continue;

		const version = match[1];
		if (seen.has(version)) continue;
		seen.add(version);

		const ltsFromLine = match[2] ? capitalize(match[2]) : null;
		versions.push({
			version,
			lts: ltsFromLine ?? ltsMap.get(version) ?? null,
			current: !!currentMatch,
		});
	}

	return versions.sort((a, b) => compareNodeVersions(b.version, a.version));
}

function compareNodeVersions(a: string, b: string): number {
	const parse = (v: string) =>
		v.replace(/^v/, "").split(".").map(Number) as [number, number, number];
	const [aMaj, aMin, aPat] = parse(a);
	const [bMaj, bMin, bPat] = parse(b);
	return aMaj - bMaj || aMin - bMin || aPat - bPat;
}

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
