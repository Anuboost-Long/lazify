import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const GIT_ENV = {
	GIT_CONFIG_GLOBAL: "/dev/null",
	GIT_CONFIG_NOSYSTEM: "1",
	GIT_AUTHOR_NAME: "Lazify Test",
	GIT_AUTHOR_EMAIL: "test@lazify.local",
	GIT_COMMITTER_NAME: "Lazify Test",
	GIT_COMMITTER_EMAIL: "test@lazify.local",
	GIT_AUTHOR_DATE: "2026-10-09T12:00:00Z",
	GIT_COMMITTER_DATE: "2026-10-09T12:00:00Z",
	GIT_TERMINAL_PROMPT: "0",
};

export interface GitApi {
	getProjectGitStatus(projectPath: string): Promise<unknown>;
	getWorkingChanges(projectPath: string): Promise<unknown>;
	getFileDiff(projectPath: string, filePath: string, fullFile?: boolean): Promise<string>;
	checkoutProjectBranch(projectPath: string, branch: string): Promise<unknown>;
	stageFiles(projectPath: string, paths: string[]): Promise<unknown>;
	unstageFiles(projectPath: string, paths: string[]): Promise<unknown>;
	discardChanges(projectPath: string, paths: string[]): Promise<unknown>;
	commitChanges(projectPath: string, message: string): Promise<unknown>;
	pushCurrentBranch(projectPath: string): Promise<unknown>;
	pullCurrentBranch(projectPath: string): Promise<unknown>;
}

export function useGitEnv() {
	Object.assign(process.env, GIT_ENV);
}

const SETUP_GIT = "/usr/bin/git";

function git(cwd: string, ...args: string[]) {
	return execFileSync(SETUP_GIT, args, { cwd, encoding: "utf8", env: { ...process.env, ...GIT_ENV } });
}

function write(root: string, file: string, contents: string) {
	fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
	fs.writeFileSync(path.join(root, file), contents);
}

export function makeRepo(): string {
	const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "lazify-git-")));
	git(root, "init", "--quiet", "-b", "main");
	write(root, "README.md", "# Demo\n\nLine one.\nLine two.\n");
	write(root, "src/app.ts", 'export const name = "demo";\nexport const answer = 41;\n');
	write(root, "src/old-name.ts", "export {};\n");
	write(root, "logo.png", "\u0089PNG\u0000\u0000binary");
	git(root, "add", "-A");
	git(root, "commit", "--quiet", "-m", "first");
	git(root, "branch", "feature");
	return root;
}

export function dirtyRepo(root: string) {
	write(root, "src/app.ts", 'export const name = "demo";\nexport const answer = 42;\nexport const extra = true;\n');
	write(root, "README.md", "# Demo\n\nLine one.\n");
	git(root, "mv", "src/old-name.ts", "src/new-name.ts");
	write(root, "notes/todo.md", "one\ntwo\nthree\n");
	write(root, "notes/empty.txt", "");
	write(root, "-n.txt", "a file named like a flag\n");
	write(root, "logo.png", "\u0089PNG\u0000\u0000changed binary");
	git(root, "add", "README.md");
}

const normalise = (value: unknown, root: string) =>
	JSON.parse(JSON.stringify(value ?? null).replaceAll(root, "<repo>"));

export async function exercise(api: GitApi): Promise<Record<string, unknown>> {
	const root = makeRepo();
	const notRepo = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "lazify-plain-")));
	write(notRepo, "index.js", "console.log(1);\n");
	const results: Record<string, unknown> = {};
	const record = (name: string, value: unknown) => {
		results[name] = normalise(value, root);
	};

	try {
		record("clean status", await api.getProjectGitStatus(root));
		dirtyRepo(root);
		record("dirty status", await api.getProjectGitStatus(root));
		record("status from a subfolder", await api.getProjectGitStatus(path.join(root, "src")));
		record("working changes", await api.getWorkingChanges(root));
		record("diff of a modified file", await api.getFileDiff(root, "src/app.ts"));
		record("full-file diff", await api.getFileDiff(root, "src/app.ts", true));
		record("diff of an untracked file", await api.getFileDiff(root, "notes/todo.md"));
		record("diff of a binary file", await api.getFileDiff(root, "logo.png"));
		record("diff of a missing file", await api.getFileDiff(root, "nope.txt"));

		record("stage nothing", await api.stageFiles(root, []));
		record("stage a flag-like name", await api.stageFiles(root, ["-n.txt", "src/app.ts"]));
		record("status after staging", await api.getProjectGitStatus(root));
		record("unstage", await api.unstageFiles(root, ["src/app.ts"]));
		record("stage a missing path", await api.stageFiles(root, ["missing.txt"]));
		record("discard tracked and untracked", await api.discardChanges(root, ["src/app.ts", "notes/todo.md"]));
		record("status after discard", await api.getProjectGitStatus(root));
		record("commit without a message", await api.commitChanges(root, "   "));
		record("commit", await api.commitChanges(root, "  Save work  "));
		record("status after commit", await api.getProjectGitStatus(root));
		write(root, "src/new-name.ts", "export const conflict = 1;\n");
		record("checkout refused by local changes", await api.checkoutProjectBranch(root, "feature"));
		record("checkout a missing branch", await api.checkoutProjectBranch(root, "nope"));
		record("push without a remote", await api.pushCurrentBranch(root));
		record("pull without a remote", await api.pullCurrentBranch(root));
		git(root, "checkout", "--quiet", "--", "src/new-name.ts");
		record("checkout", await api.checkoutProjectBranch(root, "feature"));
		record("status on feature", await api.getProjectGitStatus(root));

		record("status of a plain folder", normalise(await api.getProjectGitStatus(notRepo), notRepo));
		results["changes in a plain folder"] = normalise(await api.getWorkingChanges(notRepo), notRepo);
		results["diff in a plain folder"] = normalise(await api.getFileDiff(notRepo, "index.js"), notRepo);
		write(notRepo, "index.js", "console.log(2);\nconsole.log(3);\n");
		write(notRepo, "added.txt", "new\n");
		write(notRepo, "node_modules/pkg/index.js", "ignored by the shadow excludes\n");
		results["changes in a plain folder after edits"] = normalise(await api.getWorkingChanges(notRepo), notRepo);
		results["diff in a plain folder after edits"] = normalise(await api.getFileDiff(notRepo, "index.js"), notRepo);
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
		fs.rmSync(notRepo, { recursive: true, force: true });
	}

	return results;
}
