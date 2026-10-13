import { desktop } from "@chain/sdk";
import type { ChainOs, ProcessExit, ProcessHandle } from "@chain/sdk";

import { withSessionPath } from "./session-path";

export interface ExecFileOptions {
	cwd?: string;
	env?: Record<string, string>;
	timeout?: number;
	maxBuffer?: number;
}

export interface ExecFileResult {
	stdout: string;
	stderr: string;
}

export class ExecFileError extends Error {
	constructor(
		message: string,
		readonly code: number | null,
		readonly killed: boolean,
		readonly stdout: string,
		readonly stderr: string,
	) {
		super(message);
		this.name = "ExecFileError";
	}
}

const DEFAULT_MAX_BUFFER = 1024 * 1024;


export async function execFile(
	command: string,
	args: string[],
	{ cwd, env, timeout, maxBuffer = DEFAULT_MAX_BUFFER }: ExecFileOptions = {},
): Promise<ExecFileResult> {
	let stdout = "";
	let stderr = "";
	let overflowed = false;
	let handle: ProcessHandle | undefined;

	handle = await desktop.processRunner.run(
		command,
		args,
		({ stream, data }) => {
			if (stream === "stdout") stdout += data;
			else stderr += data;

			if (!overflowed && stdout.length + stderr.length > maxBuffer) {
				overflowed = true;
				void handle?.kill().catch(() => undefined);
			}
		},
		{ cwd, env: withSessionPath(env) },
	);

	const running = handle;
	if (overflowed) void running.kill().catch(() => undefined);

	const timer = timeout ? setTimeout(() => void running.kill().catch(() => undefined), timeout) : undefined;
	const exit = await running.exited;
	clearTimeout(timer);

	if (exit.code === 0 && !exit.killed) return { stdout, stderr };

	throw new ExecFileError(`${command} ${failureOf(exit, overflowed)}`, exit.code, exit.killed, stdout, stderr);
}

/** Starts a program that is not Lazify's to stop: it keeps running after Lazify quits. */
export function launch(command: string, args: string[]): Promise<void> {
	return desktop.processRunner.launch(command, args);
}

function failureOf(exit: ProcessExit, overflowed: boolean) {
	if (overflowed) return "maxBuffer exceeded";
	if (exit.killed) return "timed out";

	return `exited with code ${exit.code}`;
}

let os: Promise<ChainOs> | null = null;

export function currentOs(): Promise<ChainOs> {
	os ??= desktop.platform.getInfo().then((info) => info.os);

	return os;
}

const variables = new Map<string, Promise<string | null>>();

export function environmentVariable(name: string): Promise<string | null> {
	let value = variables.get(name);

	if (!value) {
		value = execFile("printenv", [name]).then(
			({ stdout }) => stdout.trim() || null,
			() => null,
		);
		variables.set(name, value);
	}

	return value;
}

/** Which of `paths` are files, following links, in one process however many there are. */
export async function existingFiles(paths: string[]): Promise<Set<string>> {
	if (paths.length === 0) return new Set();

	const { stdout } = await execFile("/bin/sh", ["-c", 'for p; do [ -f "$p" ] && printf "%s\\n" "$p"; done; exit 0', "sh", ...paths]);

	return new Set(stdout.split("\n").filter(Boolean));
}

const GREP_BATCH = 500;

/** Which of `paths` contain `text` byte for byte, a few hundred files per process. */
export async function filesContaining(text: string, paths: string[]): Promise<Set<string>> {
	const batches: string[][] = [];
	for (let start = 0; start < paths.length; start += GREP_BATCH) batches.push(paths.slice(start, start + GREP_BATCH));

	const outputs = await Promise.all(
		batches.map((batch) =>
			execFile("grep", ["-l", "-F", "-e", text, "--", ...batch], { maxBuffer: 16 * 1024 * 1024 }).then(
				({ stdout }) => stdout,
				// 1: nothing matched; 2: a file couldn't be read, but the matches are still listed.
				(error: unknown) => (error instanceof ExecFileError ? error.stdout : ""),
			),
		),
	);

	return new Set(outputs.flatMap((output) => output.split("\n")).filter(Boolean));
}

export function pathExistsOnDisk(path: string): Promise<boolean> {
	return execFile("test", ["-e", path]).then(
		() => true,
		() => false,
	);
}
