import { currentOs, execFile as execFileAsync } from "@/platform/exec";
import {
	appDataPath,
	createFolder,
	deletePath,
	listFolderNames,
	pathExists,
	readSmallText,
	writeTextFile,
} from "@/platform/folders";
import type { AgentFileChange } from "@/shared/types/git";

import { getStatusLabel } from "./project-git-status";

/** Untracked files are line-counted by hand; skip anything unreasonably large. */
const MAX_UNTRACKED_BYTES = 2_000_000;
/** A diff big enough to freeze the renderer is truncated instead. */
const MAX_DIFF_CHARS = 400_000;
/** Context lines that make a whole-file diff out of a hunk-only one. */
const FULL_FILE_CONTEXT = 1_000_000;

/**
 * Projects that aren't in a repo still deserve a review panel, so they get a
 * repo of their own kept outside the project — `--git-dir` points at our own
 * storage, `--work-tree` at theirs, which leaves the folder itself untouched.
 * Every git command below works the same against either backend.
 */
const SHADOW_EXCLUDES = [
	".git/",
	"node_modules/",
	"dist/",
	"dist-electron/",
	"build/",
	"out/",
	".next/",
	".expo/",
	".turbo/",
	".cache/",
	"coverage/",
	".venv/",
	"__pycache__/",
	"vendor/",
	"Pods/",
	".DS_Store",
	"*.log",
];

/** Shadow repos already prepared this run, so the poll doesn't re-check them. */
const shadowReady = new Set<string>();

const RUN_ID_KEY = "lazify:shadow-run";

/**
 * Electron named each run's folder by its process id. Chain has none, so a run
 * is identified by an id kept in sessionStorage: it survives a page reload and
 * is gone when the app restarts, which is when Electron started afresh too.
 */
function currentRunId(): string {
	let runId = sessionStorage.getItem(RUN_ID_KEY);

	if (!runId) {
		runId = crypto.randomUUID();
		sessionStorage.setItem(RUN_ID_KEY, runId);
	}

	return runId;
}

async function shadowStore(): Promise<string> {
	return `${await appDataPath()}/shadow-repos`;
}

let pruned: Promise<void> | null = null;

/**
 * Shadow repos only ever describe the session that created them, so the ones
 * an earlier run left behind are thrown away before this run makes its own.
 */
export function cleanupShadowRepos(): Promise<void> {
	pruned ??= (async () => {
		const store = await shadowStore();
		const runId = currentRunId();

		for (const name of await listFolderNames(store)) {
			if (name !== runId) await deletePath(`${store}/${name}`).catch(() => undefined);
		}
	})();

	return pruned;
}

async function shadowGitDir(projectPath: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(projectPath));
	const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0"))
		.join("")
		.slice(0, 16);
	const name = projectPath.slice(projectPath.lastIndexOf("/") + 1);

	return `${await shadowStore()}/${currentRunId()}/${name}-${hash}`;
}

/**
 * Creates the shadow repo on first use and commits the project as it stands,
 * so everything the agent does afterwards shows up as a change against it.
 * Returns the git arguments that address it, or null when git is unusable.
 */
async function prepareShadow(projectPath: string): Promise<string[] | null> {
	try {
		await cleanupShadowRepos();

		const gitDir = await shadowGitDir(projectPath);
		const args = ["--git-dir", gitDir, "--work-tree", projectPath];

		if (shadowReady.has(projectPath)) return args;

		// A HEAD file means we already set this one up on an earlier poll.
		if (!(await pathExists(`${gitDir}/HEAD`))) {
			// `git init` creates the git dir itself but not the folders above it.
			await createFolder(gitDir);

			await execFileAsync("git", [...args, "init", "--quiet"], {
				cwd: projectPath,
			});

			// Written before the first add: without it, `node_modules` alone can turn
			// the baseline into a multi-minute index write.
			await createFolder(`${gitDir}/info`);
			await writeTextFile(`${gitDir}/info/exclude`, `${SHADOW_EXCLUDES.join("\n")}\n`);

			await execFileAsync("git", [...args, "add", "-A"], { cwd: projectPath });
			// The user's own identity and hooks have no business in a private repo
			// they never asked for, so everything is supplied inline.
			await execFileAsync(
				"git",
				[
					...args,
					"-c",
					"user.name=Lazify",
					"-c",
					"user.email=lazify@localhost",
					"-c",
					"commit.gpgsign=false",
					"commit",
					"--quiet",
					"--no-verify",
					"-m",
					"lazify baseline",
				],
				{ cwd: projectPath },
			);
		}

		shadowReady.add(projectPath);

		return args;
	} catch {
		return null;
	}
}

/**
 * A real repo is always preferred — the project's own history is the honest
 * answer. The shadow repo is only for folders git knows nothing about.
 */
async function resolveBackend(
	projectPath: string,
): Promise<{ args: string[]; root: string } | null> {
	try {
		const { stdout } = await execFileAsync("git", ["rev-parse", "--show-toplevel"], {
			cwd: projectPath,
		});

		return { args: [], root: stdout.trim() };
	} catch {
		const args = await prepareShadow(projectPath);

		return args ? { args, root: projectPath } : null;
	}
}

function parseStatusPath(rawPath: string) {
	const renameMarker = " -> ";
	const renameIndex = rawPath.indexOf(renameMarker);

	return renameIndex === -1
		? rawPath.trim()
		: rawPath.slice(renameIndex + renameMarker.length).trim();
}

async function countUntrackedLines(absolutePath: string) {
	try {
		const contents = await readSmallText(absolutePath, MAX_UNTRACKED_BYTES);

		// Looks binary — line counts would be meaningless.
		if (contents.includes("\u0000")) return 0;

		return contents.length === 0 ? 0 : contents.replace(/\n$/, "").split("\n").length;
	} catch {
		return 0;
	}
}

/**
 * Every file that currently differs from HEAD, with its line counts — the
 * counts are what lets the renderer tell "changed during this session" from
 * "was already dirty when the session started".
 */
export async function getWorkingChanges(projectPath: string): Promise<AgentFileChange[]> {
	try {
		const backend = await resolveBackend(projectPath);

		if (!backend) return [];

		const { args, root: repoRoot } = backend;

		const [statusResult, numstatResult] = await Promise.all([
			// -uall so new folders are listed file by file rather than as one entry.
			execFileAsync("git", [...args, "status", "--porcelain=v1", "-uall"], {
				cwd: projectPath,
			}),
			execFileAsync("git", [...args, "diff", "HEAD", "--numstat"], {
				cwd: projectPath,
			}).catch(() =>
				execFileAsync("git", [...args, "diff", "--numstat"], {
					cwd: projectPath,
				}),
			),
		]);

		const counts = new Map<string, { additions: number; deletions: number }>();

		for (const line of numstatResult.stdout.split("\n")) {
			if (!line.trim()) continue;

			const [additions, deletions, ...rest] = line.split("\t");
			const filePath = parseStatusPath(rest.join("\t"));

			counts.set(filePath, {
				// Binary files report "-" instead of a number.
				additions: Number.parseInt(additions, 10) || 0,
				deletions: Number.parseInt(deletions, 10) || 0,
			});
		}

		const lines = statusResult.stdout
			.split("\n")
			.map((line) => line.trimEnd())
			.filter(Boolean);

		return await Promise.all(
			lines.map(async (line) => {
				const stagedStatus = line[0] ?? " ";
				const unstagedStatus = line[1] ?? " ";
				const filePath = parseStatusPath(line.slice(3));
				const isUntracked = stagedStatus === "?" || unstagedStatus === "?";
				const counted = counts.get(filePath);

				return {
					path: filePath,
					absolutePath: `${repoRoot}/${filePath}`,
					statusLabel: getStatusLabel(stagedStatus, unstagedStatus),
					untracked: isUntracked,
					additions: isUntracked
						? await countUntrackedLines(`${repoRoot}/${filePath}`)
						: (counted?.additions ?? 0),
					deletions: isUntracked ? 0 : (counted?.deletions ?? 0),
				};
			}),
		);
	} catch {
		return [];
	}
}

/**
 * Unified diff for one file, including untracked ones (diffed against
 * /dev/null).
 *
 * @param fullFile asks git for enough context to cover the whole file, so the
 * viewer can show the changes in place in the complete source rather than as
 * detached hunks. The result is still an ordinary unified diff.
 */
export async function getFileDiff(
	projectPath: string,
	filePath: string,
	fullFile = false,
): Promise<string> {
	const run = async (args: string[]) => {
		try {
			const { stdout } = await execFileAsync("git", args, {
				cwd: projectPath,
				maxBuffer: 16 * 1024 * 1024,
			});
			return stdout;
		} catch (error) {
			// `git diff --no-index` exits 1 whenever it finds differences.
			const stdout = (error as { stdout?: string }).stdout;
			if (typeof stdout === "string" && stdout.length > 0) return stdout;
			return "";
		}
	};

	const backend = await resolveBackend(projectPath);

	if (!backend) return "";

	const emptyDevice = (await currentOs()) === "windows" ? "NUL" : "/dev/null";
	// No file is longer than this, so one hunk ends up covering all of it.
	const context = fullFile ? [`-U${FULL_FILE_CONTEXT}`] : [];
	const tracked = await run([...backend.args, "diff", ...context, "HEAD", "--", filePath]);
	// The no-index form compares two paths directly, so it needs no repo at all.
	const diff =
		tracked || (await run(["diff", ...context, "--no-index", "--", emptyDevice, filePath]));

	return diff.length > MAX_DIFF_CHARS ? `${diff.slice(0, MAX_DIFF_CHARS)}\n…` : diff;
}
