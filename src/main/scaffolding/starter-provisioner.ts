import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { replaceStarterNameToken } from "./starter-name-token";
import {
  readStarterDescriptor,
  STARTER_DESCRIPTOR_FILE,
  type StarterDescriptor,
  type StarterSubstitution
} from "./starter-descriptor";

const execFileAsync = promisify(execFile);

/** The only placeholder a starter may use. */
const PROJECT_NAME_PLACEHOLDER = "{{projectName}}";

export type StarterFailureReason = "git-missing" | "offline" | "unreachable" | "clone-failed";

/**
 * Carries why the clone failed so the UI can say the one useful thing. "No
 * internet connection" and "that tag does not exist" need different responses,
 * and a single generic failure would leave the user guessing.
 */
export class StarterError extends Error {
  constructor(
    readonly reason: StarterFailureReason,
    message: string
  ) {
    super(message);
    this.name = "StarterError";
  }
}

export interface ProvisionStarterOptions {
  /** `owner/name` on GitHub. */
  repo: string;
  /** A tag, never a branch: a push to the starter must not change what an existing pin produces. */
  ref: string;
  /** Where the project is being created. The clone lands here directly. */
  projectPath: string;
  projectName: string;
}

/**
 * git reports every one of these as a failed clone, so the message is the only
 * thing that distinguishes "you are offline" from "that starter is gone".
 */
export function classifyCloneFailure(stderr: string): StarterFailureReason {
  const message = stderr.toLowerCase();

  const offline = [
    "could not resolve host",
    "temporary failure in name resolution",
    "network is unreachable",
    "connection timed out",
    "connection refused",
    "failed to connect",
    "operation timed out"
  ];

  if (offline.some((pattern) => message.includes(pattern))) {
    return "offline";
  }

  const unreachable = [
    "repository not found",
    "not found in upstream origin",
    "remote branch",
    "authentication failed",
    "permission denied",
    "could not read from remote repository"
  ];

  if (unreachable.some((pattern) => message.includes(pattern))) {
    return "unreachable";
  }

  return "clone-failed";
}

/** split/join rather than replaceAll, which this build's ES2020 target lacks. */
function replaceEvery(input: string, token: string, value: string): string {
  return input.split(token).join(value);
}

/**
 * Substitution targets come from the starter repo rather than from us, so a
 * path that climbs out of the project is refused instead of trusted.
 */
function resolveInsideProject(projectPath: string, relativePath: string): string {
  const resolved = path.resolve(projectPath, relativePath);
  const root = path.resolve(projectPath);

  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new StarterError("clone-failed", `Starter tried to write outside the project: ${relativePath}`);
  }

  return resolved;
}

function setJsonPath(target: Record<string, unknown>, jsonPath: string, value: string): void {
  const keys = jsonPath.split(".");
  const leaf = keys.pop();

  if (!leaf) {
    return;
  }

  let cursor = target;

  for (const key of keys) {
    if (typeof cursor[key] !== "object" || cursor[key] === null) {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }

  cursor[leaf] = value;
}

async function applySubstitution(
  projectPath: string,
  substitution: StarterSubstitution,
  projectName: string
): Promise<void> {
  const filePath = resolveInsideProject(projectPath, substitution.file);
  const value = replaceEvery(substitution.value, PROJECT_NAME_PLACEHOLDER, projectName);

  let contents: string;

  try {
    contents = await fs.readFile(filePath, "utf8");
  } catch {
    // The starter declared a file it no longer ships. Its own CI is where that
    // gets caught; refusing to create the project would be the worse trade.
    console.warn(`Starter substitution skipped, ${substitution.file} is missing.`);
    return;
  }

  if (substitution.jsonPath) {
    const parsed = JSON.parse(contents) as Record<string, unknown>;
    setJsonPath(parsed, substitution.jsonPath, value);
    await fs.writeFile(filePath, `${JSON.stringify(parsed, null, 2)}\n`);
    return;
  }

  await fs.writeFile(filePath, replaceEvery(contents, substitution.token as string, value));
}

/**
 * Renaming the package is not a starter's choice to make. Every starter is a
 * Node project shipping a `package.json` named after itself, and a user who
 * types "my-app" must not end up with a project called `next-scaffold` — so this
 * runs whether or not the starter declares anything. It is applied first, so a
 * starter that does declare a name substitution still wins.
 */
const PACKAGE_NAME_SUBSTITUTION: StarterSubstitution = {
  file: "package.json",
  jsonPath: "name",
  value: PROJECT_NAME_PLACEHOLDER
};

export async function applySubstitutions(
  projectPath: string,
  descriptor: StarterDescriptor,
  projectName: string
): Promise<void> {
  for (const substitution of [PACKAGE_NAME_SUBSTITUTION, ...descriptor.substitutions]) {
    await applySubstitution(projectPath, substitution, projectName);
  }
}

async function assertGitAvailable(): Promise<void> {
  try {
    await execFileAsync("git", ["--version"]);
  } catch {
    throw new StarterError("git-missing", "git is not installed or is not on PATH.");
  }
}

/**
 * Clones a starter into the project directory and makes it the user's own:
 * the starter's history and its own scaffolding are removed, and the declared
 * tokens are replaced. Installing the packages the user picked is the caller's
 * step, so this stays independent of any package manager.
 */
export async function provisionStarter(options: ProvisionStarterOptions): Promise<StarterDescriptor> {
  const { repo, ref, projectPath, projectName } = options;

  await assertGitAvailable();

  try {
    await execFileAsync("git", [
      "clone",
      "--depth",
      "1",
      "--branch",
      ref,
      `https://github.com/${repo}.git`,
      projectPath
    ]);
  } catch (error) {
    const stderr = (error as { stderr?: string })?.stderr ?? (error as Error).message;
    throw new StarterError(
      classifyCloneFailure(stderr),
      `Could not clone ${repo}@${ref}: ${stderr.trim()}`
    );
  }

  const descriptor = await readStarterDescriptor(projectPath);

  // The starter's history is not the user's history, and its own scaffolding is
  // not part of their app. Both go before anything else touches the tree.
  const remove = [".git", STARTER_DESCRIPTOR_FILE, ...descriptor.excludeFromCopy];

  for (const entry of remove) {
    await fs.rm(resolveInsideProject(projectPath, entry), { recursive: true, force: true });
  }

  await applySubstitutions(projectPath, descriptor, projectName);

  // After the declared substitutions, so a starter that says something specific
  // about a file still wins over the blanket rename.
  await replaceStarterNameToken(projectPath, projectName);

  return descriptor;
}
