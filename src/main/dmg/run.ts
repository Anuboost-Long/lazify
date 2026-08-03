import { spawn } from "node:child_process";

export interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

/** Runs a command and collects its output, without a shell in the way. */
export function run(
  command: string,
  args: string[],
  /** Kills the command if it outlives this. Only worth it for `osascript`. */
  timeoutMs?: number
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let stdout = "";
    let stderr = "";
    // A Finder that is busy or waiting on a dialog leaves `osascript` hanging,
    // and a build that never resolves is worse than one that says it gave up.
    const timer = timeoutMs
      ? setTimeout(() => {
          stderr += `\nTimed out after ${Math.round(timeoutMs / 1000)}s.`;
          child.kill("SIGKILL");
        }, timeoutMs)
      : null;

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      if (timer) clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}
