import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface GitContext {
	branch: string;
	commit: string;
}

async function read(args: string[], cwd: string): Promise<string> {
	try {
		const { stdout } = await execFileAsync("git", args, { cwd });

		return stdout.trim();
	} catch {
		return "";
	}
}

export async function readGitContext(projectPath: string): Promise<GitContext> {
	const [branch, commit] = await Promise.all([
		read(["branch", "--show-current"], projectPath),
		read(["rev-parse", "--short", "HEAD"], projectPath),
	]);

	return { branch, commit };
}
