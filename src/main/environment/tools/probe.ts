import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { normalizeRuntimePath } from "../runtime-path";
import type { ToolProbe } from "./types";

const execFileAsync = promisify(execFile);

/** Asks a binary for its version. Never throws — absence is an answer. */
export async function probe(
  cmd: string,
  args: string[] = ["--version"]
): Promise<ToolProbe> {
  normalizeRuntimePath();

  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, {
      timeout: 5000,
      shell: process.platform === "win32",
      maxBuffer: 1024 * 1024
    });
    const raw = (stdout || stderr).trim();
    return { available: !!raw, version: raw || null };
  } catch {
    return { available: false, version: null };
  }
}

/**
 * The first of several names that answers.
 *
 * Tools are not called the same thing everywhere — Windows ships the Python
 * interpreter as `python`, where POSIX convention is `python3` — and a probe
 * that only knows one name reports a tool as missing on the platform that
 * spells it differently.
 */
export async function probeAny(names: string[], args?: string[]): Promise<ToolProbe> {
  for (const name of names) {
    const found = await probe(name, args);
    if (found.available) return found;
  }

  return { available: false, version: null };
}

// Probes return whatever the tool prints (`pip 25.3 from /Library/…`,
// `go version go1.21 darwin/arm64`, …). Keep only the version token so the UI
// never has to render a full sentence.
export function extractVersion(raw: string | null): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const firstLine = value.split("\n")[0].trim();
  return firstLine.match(/\d[\w.+-]*/)?.[0] ?? firstLine;
}
