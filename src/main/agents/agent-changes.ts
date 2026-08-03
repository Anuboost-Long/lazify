import { app } from "electron";
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type { AgentFileChange } from "../../renderer/shared/types/lazify";
import { getStatusLabel } from "../projects/project-git-status";

const execFileAsync = promisify(execFile);

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

function shadowRoot(): string {
  return path.join(app.getPath("userData"), "shadow-repos");
}

/**
 * Shadow repos only ever describe the session that created them, so they are
 * thrown away with it — on quit, and again on launch to catch the ones a crash
 * left behind. Real repos are never touched by this.
 */
export function cleanupShadowRepos(): void {
  try {
    fs.rmSync(shadowRoot(), { recursive: true, force: true });
  } catch {
    // Storage we failed to reclaim is reclaimed on the next launch instead.
  }

  shadowReady.clear();
}

function shadowGitDir(projectPath: string): string {
  const hash = crypto
    .createHash("sha1")
    .update(projectPath)
    .digest("hex")
    .slice(0, 16);

  return path.join(shadowRoot(), `${path.basename(projectPath)}-${hash}`);
}

/**
 * Creates the shadow repo on first use and commits the project as it stands,
 * so everything the agent does afterwards shows up as a change against it.
 * Returns the git arguments that address it, or null when git is unusable.
 */
async function prepareShadow(projectPath: string): Promise<string[] | null> {
  const gitDir = shadowGitDir(projectPath);
  const args = ["--git-dir", gitDir, "--work-tree", projectPath];

  if (shadowReady.has(projectPath)) return args;

  try {
    // A HEAD file means we already set this one up on an earlier run.
    if (!fs.existsSync(path.join(gitDir, "HEAD"))) {
      // `git init` creates the git dir itself but not the folders above it.
      fs.mkdirSync(gitDir, { recursive: true });

      await execFileAsync("git", [...args, "init", "--quiet"], {
        cwd: projectPath,
      });

      // Written before the first add: without it, `node_modules` alone can turn
      // the baseline into a multi-minute index write.
      fs.mkdirSync(path.join(gitDir, "info"), { recursive: true });
      fs.writeFileSync(
        path.join(gitDir, "info", "exclude"),
        `${SHADOW_EXCLUDES.join("\n")}\n`,
        "utf8",
      );

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
    const { stdout } = await execFileAsync(
      "git",
      ["rev-parse", "--show-toplevel"],
      { cwd: projectPath },
    );

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

function countUntrackedLines(absolutePath: string) {
  try {
    const stat = fs.statSync(absolutePath);

    if (!stat.isFile() || stat.size > MAX_UNTRACKED_BYTES) return 0;

    const contents = fs.readFileSync(absolutePath, "utf8");

    // Looks binary — line counts would be meaningless.
    if (contents.includes("\u0000")) return 0;

    return contents.length === 0
      ? 0
      : contents.replace(/\n$/, "").split("\n").length;
  } catch {
    return 0;
  }
}

/**
 * Every file that currently differs from HEAD, with its line counts — the
 * counts are what lets the renderer tell "changed during this session" from
 * "was already dirty when the session started".
 */
export async function getWorkingChanges(
  projectPath: string,
): Promise<AgentFileChange[]> {
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
            : (counted?.additions ?? 0),
          deletions: isUntracked ? 0 : (counted?.deletions ?? 0),
        };
      });
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

  const emptyDevice = process.platform === "win32" ? "NUL" : "/dev/null";
  // No file is longer than this, so one hunk ends up covering all of it.
  const context = fullFile ? [`-U${FULL_FILE_CONTEXT}`] : [];
  const tracked = await run([
    ...backend.args,
    "diff",
    ...context,
    "HEAD",
    "--",
    filePath,
  ]);
  // The no-index form compares two paths directly, so it needs no repo at all.
  const diff =
    tracked ||
    (await run([
      "diff",
      ...context,
      "--no-index",
      "--",
      emptyDevice,
      filePath,
    ]));

  return diff.length > MAX_DIFF_CHARS
    ? `${diff.slice(0, MAX_DIFF_CHARS)}\n…`
    : diff;
}
