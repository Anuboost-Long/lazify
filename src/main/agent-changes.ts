import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type { AgentFileChange } from "../renderer/shared/types/lazify";
import { getStatusLabel } from "./project-git-status";

const execFileAsync = promisify(execFile);

/** Untracked files are line-counted by hand; skip anything unreasonably large. */
const MAX_UNTRACKED_BYTES = 2_000_000;
/** A diff big enough to freeze the renderer is truncated instead. */
const MAX_DIFF_CHARS = 400_000;

function parseStatusPath(rawPath: string) {
  const renameMarker = " -> ";
  const renameIndex = rawPath.indexOf(renameMarker);

  return renameIndex === -1
    ? rawPath.trim()
    : rawPath.slice(renameIndex + renameMarker.length).trim();
}

function countUntrackedLines(absolutePath: string) {
  try {
    const stat = fs.statSync(absolutePath);

    if (!stat.isFile() || stat.size > MAX_UNTRACKED_BYTES) return 0;

    const contents = fs.readFileSync(absolutePath, "utf8");

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
    const repoRootResult = await execFileAsync("git", ["rev-parse", "--show-toplevel"], {
      cwd: projectPath
    });
    const repoRoot = repoRootResult.stdout.trim();

    const [statusResult, numstatResult] = await Promise.all([
      // -uall so new folders are listed file by file rather than as one entry.
      execFileAsync("git", ["status", "--porcelain=v1", "-uall"], { cwd: projectPath }),
      execFileAsync("git", ["diff", "HEAD", "--numstat"], { cwd: projectPath }).catch(() =>
        execFileAsync("git", ["diff", "--numstat"], { cwd: projectPath })
      )
    ]);

    const counts = new Map<string, { additions: number; deletions: number }>();

    for (const line of numstatResult.stdout.split("\n")) {
      if (!line.trim()) continue;

      const [additions, deletions, ...rest] = line.split("\t");
      const filePath = parseStatusPath(rest.join("\t"));

      counts.set(filePath, {
        // Binary files report "-" instead of a number.
        additions: Number.parseInt(additions, 10) || 0,
        deletions: Number.parseInt(deletions, 10) || 0
      });
    }

    return statusResult.stdout
      .split("\n")
      .map((line) => line.trimEnd())
      .filter(Boolean)
      .map((line) => {
        const stagedStatus = line[0] ?? " ";
        const unstagedStatus = line[1] ?? " ";
        const filePath = parseStatusPath(line.slice(3));
        const isUntracked = stagedStatus === "?" || unstagedStatus === "?";
        const counted = counts.get(filePath);

        return {
          path: filePath,
          absolutePath: path.join(repoRoot, filePath),
          statusLabel: getStatusLabel(stagedStatus, unstagedStatus),
          untracked: isUntracked,
          additions: isUntracked
            ? countUntrackedLines(path.join(repoRoot, filePath))
            : counted?.additions ?? 0,
          deletions: isUntracked ? 0 : counted?.deletions ?? 0
        };
      });
  } catch {
    return [];
  }
}

/** Unified diff for one file, including untracked ones (diffed against /dev/null). */
export async function getFileDiff(projectPath: string, filePath: string): Promise<string> {
  const run = async (args: string[]) => {
    try {
      const { stdout } = await execFileAsync("git", args, {
        cwd: projectPath,
        maxBuffer: 16 * 1024 * 1024
      });
      return stdout;
    } catch (error) {
      // `git diff --no-index` exits 1 whenever it finds differences.
      const stdout = (error as { stdout?: string }).stdout;
      if (typeof stdout === "string" && stdout.length > 0) return stdout;
      return "";
    }
  };

  const emptyDevice = process.platform === "win32" ? "NUL" : "/dev/null";
  const tracked = await run(["diff", "HEAD", "--", filePath]);
  const diff =
    tracked || (await run(["diff", "--no-index", "--", emptyDevice, filePath]));

  return diff.length > MAX_DIFF_CHARS ? `${diff.slice(0, MAX_DIFF_CHARS)}\n…` : diff;
}
