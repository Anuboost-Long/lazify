import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { loginShell } from "../login-shell";
import { runWithNvm } from "./nvm-shell";
import { CANNOT_CHECK, type ToolUpdateInfo } from "./types";

const execFileAsync = promisify(execFile);

const normalize = (version: string) => version.replace(/^v/, "").trim();

/** Same version, differently written, is not an update. */
export function compareToLatest(currentVersion: string, latest: string | null): ToolUpdateInfo {
	if (!latest) return CANNOT_CHECK;

	return {
		hasUpdate: normalize(latest) !== normalize(currentVersion),
		latestVersion: latest,
		canCheck: true,
	};
}

/**
 * The newest version the registry has, within the major already installed —
 * a package manager two majors behind is a deliberate choice far more often
 * than it is neglect, and offering the jump as a routine update is how a
 * project's toolchain gets changed underneath it.
 */
export async function npmViewUpdate(name: string, currentVersion: string): Promise<ToolUpdateInfo> {
	const major = normalize(currentVersion).split(".")[0];
	const tag = major ? `${name}@${major}` : name;

	try {
		const { stdout } = await runWithNvm(`npm view ${tag} version`, 10000);
		return compareToLatest(currentVersion, parseNpmViewVersion(stdout));
	} catch {
		return CANNOT_CHECK;
	}
}

/**
 * The last line of `npm view pkg@10 version`, and only the version out of it.
 *
 * A range that matches one version prints it bare. A range that matches several
 * prints `pkg@10.0.0 '10.0.0'` per line, *oldest first* — so reading the first
 * line, as this used to, reported the oldest release in the major as the newest
 * one and offered a downgrade as an update.
 */
export function parseNpmViewVersion(stdout: string): string | null {
	const lines = stdout
		.trim()
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
	const last = lines[lines.length - 1];
	if (!last) return null;

	return /'([^']+)'\s*$/.exec(last)?.[1] ?? last;
}

/**
 * Homebrew only, and macOS only. The other two platforms answer "cannot check"
 * rather than spawning a package manager that would want a password to reply.
 */
export async function brewOutdated(formula: string): Promise<ToolUpdateInfo> {
	if (process.platform !== "darwin") return CANNOT_CHECK;

	try {
		const { stdout } = await execFileAsync(...loginShell(`brew outdated ${formula} --verbose`), {
			timeout: 20000,
			maxBuffer: 1024 * 1024,
		});
		const out = stdout.trim();
		const match = /\S+\s+([^\s<]+)\s+<\s+(\S+)/.exec(out);
		return { hasUpdate: out.length > 0, latestVersion: match?.[2] ?? null, canCheck: true };
	} catch {
		return CANNOT_CHECK;
	}
}
