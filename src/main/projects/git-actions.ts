import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Write operations on a repository — staging, committing, pushing.
 *
 * Reading status lives in `project-git-status.ts`; this file only mutates.
 * Every command is run with `--` before user-supplied paths so a file named
 * like a flag cannot become one, and failures return git's own stderr rather
 * than a rewritten message, because git explains refusals better than we can.
 */

export interface GitActionResult {
  success: boolean;
  message: string;
}

function toResult(error: unknown): GitActionResult {
  const stderr =
    typeof error === "object" && error !== null && "stderr" in error
      ? String((error as { stderr: unknown }).stderr).trim()
      : "";

  return {
    success: false,
    message: stderr || (error instanceof Error ? error.message : "Git command failed.")
  };
}

async function run(projectPath: string, args: string[]): Promise<GitActionResult> {
  try {
    await execFileAsync("git", args, { cwd: projectPath });

    return { success: true, message: "" };
  } catch (error) {
    return toResult(error);
  }
}

export async function stageFiles(
  projectPath: string,
  paths: string[]
): Promise<GitActionResult> {
  if (paths.length === 0) return { success: true, message: "" };

  return run(projectPath, ["add", "--", ...paths]);
}

export async function unstageFiles(
  projectPath: string,
  paths: string[]
): Promise<GitActionResult> {
  if (paths.length === 0) return { success: true, message: "" };

  return run(projectPath, ["restore", "--staged", "--", ...paths]);
}

/** Paths git does not track yet, which `restore` cannot act on. */
async function findUntracked(projectPath: string, paths: string[]): Promise<Set<string>> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      // -uall so an untracked file is reported by its own path rather than
      // folded into its parent directory, which would never match.
      ["status", "--porcelain=v1", "-uall", "--", ...paths],
      { cwd: projectPath }
    );

    const untracked = new Set<string>();

    for (const line of stdout.split("\n")) {
      if (line.startsWith("?? ")) untracked.add(line.slice(3).trim());
    }

    return untracked;
  } catch {
    return new Set();
  }
}

/**
 * Throws away local edits. Tracked files are restored from HEAD; untracked
 * ones have to be deleted outright, since there is no version to restore to —
 * which is why the caller must confirm before this runs.
 */
export async function discardChanges(
  projectPath: string,
  paths: string[]
): Promise<GitActionResult> {
  if (paths.length === 0) return { success: true, message: "" };

  const untracked = await findUntracked(projectPath, paths);
  const tracked = paths.filter((path) => !untracked.has(path));

  if (tracked.length > 0) {
    const restored = await run(projectPath, [
      "restore",
      "--staged",
      "--worktree",
      "--source=HEAD",
      "--",
      ...tracked
    ]);

    if (!restored.success) return restored;
  }

  if (untracked.size > 0) {
    return run(projectPath, ["clean", "-fd", "--", ...untracked]);
  }

  return { success: true, message: "" };
}

export async function commitChanges(
  projectPath: string,
  message: string
): Promise<GitActionResult> {
  const trimmed = message.trim();

  if (!trimmed) return { success: false, message: "A commit message is required." };

  return run(projectPath, ["commit", "-m", trimmed]);
}

/**
 * Pushes the current branch. A branch with no upstream is published with
 * `-u origin <branch>`, which is the only way the first push of a new branch
 * can succeed — git itself suggests exactly this.
 */
export async function pushCurrentBranch(projectPath: string): Promise<GitActionResult> {
  const first = await run(projectPath, ["push"]);

  if (first.success) return first;

  if (!/no upstream branch|set-upstream/i.test(first.message)) return first;

  try {
    const { stdout } = await execFileAsync("git", ["branch", "--show-current"], {
      cwd: projectPath
    });
    const branch = stdout.trim();

    if (!branch) return first;

    return run(projectPath, ["push", "-u", "origin", branch]);
  } catch (error) {
    return toResult(error);
  }
}
