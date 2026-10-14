import { execFile, ExecFileError } from "@/platform/exec";

export interface RunResult {
	code: number | null;
	stdout: string;
	stderr: string;
}

/**
 * Runs a command and collects its output, never throwing on a non-zero exit —
 * only on a command that could not be started at all, the same split
 * Electron's own `spawn`-based version drew between an 'error' event and a
 * normal close.
 */
export async function run(
	command: string,
	args: string[],
	/** Kills the command if it outlives this. Only worth it for `osascript`. */
	timeoutMs?: number,
): Promise<RunResult> {
	try {
		const { stdout, stderr } = await execFile(command, args, { timeout: timeoutMs });

		return { code: 0, stdout, stderr };
	} catch (error) {
		if (error instanceof ExecFileError) return { code: error.code, stdout: error.stdout, stderr: error.stderr };

		throw error;
	}
}
