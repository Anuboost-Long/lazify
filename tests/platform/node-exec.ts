import { execFile as execFileCallback } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";

/** `@/platform/exec` on Node, for tests that run real programs and read real folders. */

const run = promisify(execFileCallback);

export const execFile = (
	command: string,
	args: string[],
	{ cwd, timeout, maxBuffer = 1024 * 1024 }: { cwd?: string; timeout?: number; maxBuffer?: number } = {},
) => run(command, args, { cwd, timeout, maxBuffer, encoding: "utf8" });

const passing = (test: (stats: { isFile(): boolean }) => boolean) => async (paths: string[]) => {
	const results = await Promise.all(paths.map((candidate) => fs.stat(candidate).then(test, () => false)));
	return new Set(paths.filter((_candidate, index) => results[index]));
};

export const existingFiles = passing((stats) => stats.isFile());
export const existingPaths = passing(() => true);
export const pathExistsOnDisk = (target: string) => fs.stat(target).then(() => true, () => false);
