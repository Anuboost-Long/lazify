import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import type { ProjectGitStatusResult } from "../../renderer/shared/types/lazify";

const execFileAsync = promisify(execFile);

export function getStatusLabel(stagedStatus: string, unstagedStatus: string) {
  const codes = `${stagedStatus}${unstagedStatus}`;

  if (codes.includes("?")) {
    return "Untracked";
  }

  if (codes.includes("U")) {
    return "Unmerged";
  }

  if (codes.includes("A")) {
    return "Added";
  }

  if (codes.includes("D")) {
    return "Deleted";
  }

  if (codes.includes("R")) {
    return "Renamed";
  }

  if (codes.includes("C")) {
    return "Copied";
  }

  if (codes.includes("M")) {
    return "Modified";
  }

  return "Changed";
}

function parseStatusPath(rawPath: string) {
  const renameMarker = " -> ";
  const renameIndex = rawPath.indexOf(renameMarker);

  if (renameIndex === -1) {
    return rawPath.trim();
  }

  return rawPath.slice(renameIndex + renameMarker.length).trim();
}

export async function getProjectGitStatus(projectPath: string): Promise<ProjectGitStatusResult> {
  try {
    const repoRootResult = await execFileAsync(
      "git",
      ["rev-parse", "--show-toplevel"],
      { cwd: projectPath }
    );
    const repoRoot = repoRootResult.stdout.trim();

    const [branchResult, branchListResult, remoteResult, statusResult] = await Promise.all([
      execFileAsync("git", ["branch", "--show-current"], { cwd: projectPath }),
      execFileAsync("git", ["branch", "--format=%(refname:short)"], { cwd: projectPath }),
      execFileAsync("git", ["remote", "get-url", "origin"], { cwd: projectPath }).catch(() => ({ stdout: "" })),
      // -uall: without it git collapses an untracked directory into a single
      // "dir/" entry, which the tree then draws as one mysterious file.
      execFileAsync("git", ["status", "--porcelain=v1", "-uall"], { cwd: projectPath })
    ]);
    const branches = branchListResult.stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const entries = statusResult.stdout
      .split("\n")
      .map((line) => line.trimEnd())
      .filter(Boolean)
      .map((line) => {
        const stagedStatus = line[0] ?? " ";
        const unstagedStatus = line[1] ?? " ";
        const parsedPath = parseStatusPath(line.slice(3));

        return {
          path: parsedPath,
          absolutePath: path.join(repoRoot, parsedPath),
          stagedStatus,
          unstagedStatus,
          statusLabel: getStatusLabel(stagedStatus, unstagedStatus)
        };
      });

    return {
      projectPath,
      repoRoot,
      remoteUrl: remoteResult.stdout.trim() || null,
      branch: branchResult.stdout.trim() || null,
      branches,
      isGitRepo: true,
      hasUncommittedChanges: entries.length > 0,
      entries
    };
  } catch {
    return {
      projectPath,
      repoRoot: null,
      remoteUrl: null,
      branch: null,
      branches: [],
      isGitRepo: false,
      hasUncommittedChanges: false,
      entries: []
    };
  }
}

export interface GitCheckoutResult {
  success: boolean;
  /** git's own stderr on failure — it explains the refusal better than we can. */
  message: string;
}

/**
 * Switches the working tree to another branch.
 *
 * Nothing is stashed or forced: git refuses the checkout when local changes
 * would be overwritten, and that refusal is passed straight through so the
 * user can decide what to do rather than silently losing work.
 */
export async function checkoutProjectBranch(
  projectPath: string,
  branch: string
): Promise<GitCheckoutResult> {
  try {
    await execFileAsync("git", ["checkout", branch], { cwd: projectPath });

    return { success: true, message: "" };
  } catch (error) {
    const stderr =
      typeof error === "object" && error !== null && "stderr" in error
        ? String((error as { stderr: unknown }).stderr).trim()
        : "";

    return {
      success: false,
      message: stderr || (error instanceof Error ? error.message : "Unable to switch branch.")
    };
  }
}
