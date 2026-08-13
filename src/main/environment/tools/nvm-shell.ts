import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { loginShell } from "../login-shell";
import { probe } from "./probe";
import type { ToolProbe } from "./types";

const execFileAsync = promisify(execFile);

/**
 * nvm is a shell function, not a binary, so nothing can be spawned directly —
 * every question has to go through a shell that has sourced nvm.sh first. There
 * is no Windows equivalent: nvm-windows is a different program with a different
 * CLI, and none of these paths find it.
 */
export function findNvmScript(): string | null {
  const candidates = [
    process.env.NVM_DIR ? join(process.env.NVM_DIR, "nvm.sh") : null,
    join(homedir(), ".nvm", "nvm.sh"),
    "/opt/homebrew/opt/nvm/nvm.sh",
    "/usr/local/opt/nvm/nvm.sh"
  ].filter(Boolean) as string[];

  return candidates.find(existsSync) ?? null;
}

export function nvmSourceCmd(nvmScript: string): string {
  const nvmDir = nvmScript.replace(/\/nvm\.sh$/, "");
  return `export NVM_DIR="${nvmDir}" && source "${nvmScript}"`;
}

/** The `source nvm.sh &&` prefix for a command, or "" where there is no nvm. */
export function nvmPrefix(): string {
  const nvmScript = findNvmScript();
  return nvmScript ? `${nvmSourceCmd(nvmScript)} && ` : "";
}

/** Runs one command in a login shell with nvm sourced, when nvm is present. */
export async function runWithNvm(
  command: string,
  timeout: number,
  maxBuffer = 1024 * 1024
): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(...loginShell(`${nvmPrefix()}${command}`), { timeout, maxBuffer });
}

/**
 * A tool installed as an npm global under the nvm-managed node: invisible to a
 * bare probe, because the shim lives on a PATH only the sourced shell has.
 * Falls back to the bare probe, which is the right answer for a system-wide
 * install and the only possible one on Windows.
 */
export async function probeViaNvm(cmd: string): Promise<ToolProbe> {
  if (findNvmScript()) {
    try {
      const { stdout, stderr } = await runWithNvm(`${cmd} --version`, 6000);
      const raw = (stdout || stderr).trim().split("\n")[0].trim();
      if (raw) return { available: true, version: raw };
    } catch {
      // fall through to bare probe
    }
  }

  return probe(cmd);
}
