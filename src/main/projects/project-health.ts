import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { NpmAuditResult, NpmOutdatedResult } from "../../renderer/shared/types/lazify";

const execAsync = promisify(execFile);

type ExecError = Error & { stdout?: string };

// npm outdated and npm audit exit with code 1 when they find issues but still
// write valid JSON to stdout. We capture stdout regardless of exit code.
async function runNpmJson(args: string[], cwd: string, timeoutMs: number): Promise<string> {
	try {
		// npm is a .cmd shim on Windows, which CreateProcess will not run without
		// a shell to resolve PATHEXT — without this the health pane reports every
		// project as unreadable there.
		const { stdout } = await execAsync("npm", args, {
			cwd,
			timeout: timeoutMs,
			shell: process.platform === "win32",
		});
		return stdout;
	} catch (err) {
		const e = err as ExecError;
		if (e.stdout) return e.stdout;
		throw err;
	}
}

// npm can return { error: { code, summary, detail } } instead of packages/vulns.
// Coerce any structured error object to a plain string so the renderer never
// receives an unserializable object where it expects a string.
function extractNpmError(value: unknown): string | undefined {
	if (value === undefined || value === null) return undefined;
	if (typeof value === "string") return value;
	if (typeof value === "object") {
		const e = value as Record<string, unknown>;
		const msg = e["summary"] ?? e["code"] ?? e["detail"];
		return typeof msg === "string" ? msg : JSON.stringify(value);
	}
	return JSON.stringify(value);
}

export async function getNpmOutdated(projectPath: string): Promise<NpmOutdatedResult> {
	try {
		const raw = await runNpmJson(["outdated", "--json"], projectPath, 30_000);
		const parsed = JSON.parse(raw || "{}") as Record<string, unknown>;

		// npm can return { error: {...} } on lockfile / resolve failures
		const npmError = extractNpmError(parsed["error"]);
		if (npmError) return { packages: {}, error: npmError };

		return { packages: parsed as NpmOutdatedResult["packages"] };
	} catch (err) {
		return { packages: {}, error: err instanceof Error ? err.message : String(err) };
	}
}

export async function getNpmAudit(projectPath: string): Promise<NpmAuditResult> {
	try {
		const raw = await runNpmJson(["audit", "--json"], projectPath, 60_000);
		const parsed = JSON.parse(raw || "{}") as NpmAuditResult & { error?: unknown };

		// Normalize structured error object → string before handing off to renderer
		const npmError = extractNpmError(parsed.error);

		return {
			vulnerabilities: parsed.vulnerabilities ?? {},
			metadata: parsed.metadata ?? {
				vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 },
				dependencies: { prod: 0, dev: 0, optional: 0, peer: 0, peerOptional: 0, total: 0 },
			},
			...(npmError ? { error: npmError } : {}),
		};
	} catch (err) {
		return {
			vulnerabilities: {},
			metadata: {
				vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 },
				dependencies: { prod: 0, dev: 0, optional: 0, peer: 0, peerOptional: 0, total: 0 },
			},
			error: err instanceof Error ? err.message : String(err),
		};
	}
}
