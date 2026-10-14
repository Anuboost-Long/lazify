import { desktop } from "@chain/sdk";

import { withSessionPath } from "./session-path";

export interface LanguageServerProcess {
	write: (text: string) => void;
	kill: () => void;
	exited: Promise<unknown>;
}

/**
 * A program spoken to over stdio. Its stdout arrives as bytes, because a
 * language server frames every message by a byte count.
 */
export async function startLanguageServer(
	command: string,
	args: string[],
	{ cwd, env }: { cwd: string; env: Record<string, string> },
	onStdout: (bytes: Uint8Array) => void,
): Promise<LanguageServerProcess> {
	const handle = await desktop.processRunner.run(
		command,
		args,
		({ stream, data }) => {
			if (stream === "stdout") onStdout(data);
		},
		{ output: "bytes", keepStdinOpen: true, cwd, env: withSessionPath(env) },
	);

	// One write at a time, so messages reach stdin in the order they were sent.
	let writing = Promise.resolve();

	return {
		write: (text) => {
			writing = writing.then(() => handle.write(text)).catch(() => undefined);
		},
		kill: () => void handle.kill().catch(() => undefined),
		exited: handle.exited,
	};
}
