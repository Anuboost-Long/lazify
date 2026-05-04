import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import type { ProjectGitStatusResult } from "../renderer/shared/types/lazify";

const execFileAsync = promisify(execFile);

function getStatusLabel(stagedStatus: string, unstagedStatus: string) {
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
      execFileAsync("git", ["status", "--porcelain=v1"], { cwd: projectPath })
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
