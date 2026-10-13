import { execFile, ExecFileError } from "@/platform/exec";

/**
 * Node's promisified `execFile` as Electron's environment code called it. A
 * failure carries the command and what it printed to stderr, which is what the
 * Environment pane shows when an install or update goes wrong.
 */
export async function run(
	command: string,
	args: string[],
	options: { timeout: number; maxBuffer: number },
): Promise<{ stdout: string; stderr: string }> {
	try {
		return await execFile(command, args, options);
	} catch (error) {
		const stderr = error instanceof ExecFileError ? error.stderr : "";
		throw new Error(`Command failed: ${[command, ...args].join(" ")}\n${stderr}`);
	}
}
