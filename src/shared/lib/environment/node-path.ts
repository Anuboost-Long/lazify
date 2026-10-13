import { execFile } from "@/platform/exec";

const PROBE_TIMEOUT_MS = 4_000;

let found: string | null = null;

/**
 * The user's own Node by absolute path, as their login shell finds it. Only a
 * success is kept: Node installed while Lazify runs is found on the next ask.
 */
export async function findNodeBinary(): Promise<string | null> {
	if (found) return found;

	try {
		const { stdout } = await execFile("node", ["-p", "process.execPath"], { timeout: PROBE_TIMEOUT_MS });
		found = stdout.trim() || null;
	} catch {
		found = null;
	}

	return found;
}
