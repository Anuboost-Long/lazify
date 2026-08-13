import fs from "node:fs/promises";
import path from "node:path";

import type { EnvFileSummary, EnvVariablePatch, ProjectEnvFile } from "../../../renderer/shared/types/lazify";
import { parseEnvFile, parseEnvLine, renderEnvVariable, splitLines } from "./parse-env";

/**
 * The .env files of one project, as something a panel can list and edit.
 *
 * Every mutation re-reads the file, applies one line, and writes it back, then
 * returns the fresh parse. That costs a read per keystroke-committed edit and
 * buys two things worth more: the renderer never holds a stale copy it could
 * write over someone else's change, and a line edited by hand between two panel
 * edits is noticed rather than clobbered.
 */

/** `.env`, `.env.local`, `.env.production` — never a path, never a directory. */
const ENV_FILE = /^\.env(\.[A-Za-z0-9_.-]+)?$/;

function resolveEnvPath(projectPath: string, fileName: string): string {
  if (!ENV_FILE.test(fileName)) throw new Error(`Not an env file: ${fileName}`);

  // The name is matched above and so cannot contain a separator, but resolving
  // and re-checking is what actually rules out reaching outside the project.
  const filePath = path.resolve(projectPath, fileName);
  if (path.dirname(filePath) !== path.resolve(projectPath)) {
    throw new Error(`Env file outside the project: ${fileName}`);
  }

  return filePath;
}

async function readText(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf8");
}

/**
 * Root-level env files only. A monorepo keeps one per package, but those belong
 * to the package the workbench is pointed at, not to the repo it lives in.
 */
export async function listProjectEnvFiles(projectPath: string): Promise<EnvFileSummary[]> {
  let entries: string[];
  try {
    entries = (await fs.readdir(projectPath, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && ENV_FILE.test(entry.name))
      .map((entry) => entry.name);
  } catch {
    return [];
  }

  const summaries = await Promise.all(
    entries.map(async (name): Promise<EnvFileSummary> => {
      const filePath = resolveEnvPath(projectPath, name);
      const variables = parseEnvFile(await readText(filePath));

      return {
        name,
        path: filePath,
        variableCount: variables.length,
        disabledCount: variables.filter((variable) => !variable.enabled).length
      };
    })
  );

  // `.env` is the one every project has and the one people mean, so it leads;
  // the rest sort by name so the list does not reshuffle between reads.
  return summaries.sort((a, b) => {
    if (a.name === ".env") return -1;
    if (b.name === ".env") return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function readProjectEnvFile(projectPath: string, fileName: string): Promise<ProjectEnvFile> {
  const filePath = resolveEnvPath(projectPath, fileName);
  const text = await readText(filePath);

  return { name: fileName, path: filePath, variables: parseEnvFile(text) };
}

/**
 * Rewrites one line, having first confirmed it is still the line the caller
 * meant. A panel edit carries the key it was showing, so a file that changed
 * underneath produces a conflict the user can refresh past instead of a silent
 * write to whatever now occupies that line number.
 */
async function mutate(
  projectPath: string,
  fileName: string,
  apply: (lines: string[]) => void
): Promise<ProjectEnvFile> {
  const filePath = resolveEnvPath(projectPath, fileName);
  const text = await readText(filePath);
  const lines = splitLines(text);

  apply(lines);

  await fs.writeFile(filePath, lines.join("\n"), "utf8");

  return { name: fileName, path: filePath, variables: parseEnvFile(lines.join("\n")) };
}

function expectVariable(lines: string[], line: number, expectedKey: string) {
  const current = line >= 0 && line < lines.length ? parseEnvLine(lines[line], line) : null;
  if (!current || current.key !== expectedKey) {
    throw new Error(`${expectedKey} is no longer on line ${line + 1} — the file changed on disk.`);
  }

  return current;
}

export async function updateEnvVariable(
  projectPath: string,
  fileName: string,
  line: number,
  expectedKey: string,
  patch: EnvVariablePatch
): Promise<ProjectEnvFile> {
  return mutate(projectPath, fileName, (lines) => {
    const current = expectVariable(lines, line, expectedKey);
    lines[line] = renderEnvVariable({ ...current, ...patch });
  });
}

export async function deleteEnvVariable(
  projectPath: string,
  fileName: string,
  line: number,
  expectedKey: string
): Promise<ProjectEnvFile> {
  return mutate(projectPath, fileName, (lines) => {
    expectVariable(lines, line, expectedKey);
    lines.splice(line, 1);
  });
}

/**
 * Appends a variable, landing it after the last one rather than at the end of
 * the file — trailing blank lines and a closing comment block are common, and
 * a new key belongs with its neighbours.
 */
export async function addEnvVariable(
  projectPath: string,
  fileName: string,
  key: string,
  value: string
): Promise<ProjectEnvFile> {
  return mutate(projectPath, fileName, (lines) => {
    const rendered = renderEnvVariable({
      line: 0,
      key,
      value,
      enabled: true,
      quote: "",
      exported: false,
      comment: null,
      indent: ""
    });

    let last = -1;
    for (const [index, raw] of lines.entries()) {
      if (parseEnvLine(raw, index)) last = index;
    }

    if (last === -1) {
      // An empty or comment-only file: keep the prose, drop a trailing blank.
      const tail = lines.at(-1)?.trim() === "" ? lines.length - 1 : lines.length;
      lines.splice(tail, 0, rendered);
      return;
    }

    lines.splice(last + 1, 0, rendered);
  });
}

/** Creates an empty env file so the panel has somewhere to add the first key. */
export async function createProjectEnvFile(projectPath: string, fileName: string): Promise<ProjectEnvFile> {
  const filePath = resolveEnvPath(projectPath, fileName);

  // Never truncate an existing file: "create" from a panel that listed none is
  // the one case where the file appearing in between must win.
  await fs.writeFile(filePath, "", { encoding: "utf8", flag: "wx" });

  return { name: fileName, path: filePath, variables: [] };
}
