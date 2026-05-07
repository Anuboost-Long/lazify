import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";

import { ensureCommandAvailable } from "./scanner";

export type LogStream = "stdout" | "stderr" | "system";

export interface LogEvent {
  id: string;
  timestamp: string;
  stream: LogStream;
  message: string;
}

export interface CommandRequest {
  command: string;
  args: string[];
  cwd?: string;
}

export interface CommandResult {
  success: boolean;
  exitCode: number | null;
}

type LogEmitter = (event: LogEvent) => void;

export class CommandRunner {
  private readonly activeScripts = new Map<string, ChildProcess>();

  constructor(private readonly emitLog: LogEmitter) {}

  startScript(
    request: CommandRequest,
    emitScriptLog: LogEmitter,
    onDone: (runId: string, exitCode: number | null) => void
  ): string {
    const { command, args, cwd } = request;
    const runId = `script-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    emitScriptLog({
      id: runId,
      timestamp: new Date().toISOString(),
      stream: "system",
      message: `> ${command} ${args.join(" ")}`
    });

    const child = spawn(command, args, {
      cwd,
      env: process.env,
      shell: process.platform === "win32"
    });

    this.activeScripts.set(runId, child);

    child.stdout.on("data", (chunk: Buffer) => {
      emitScriptLog({
        id: runId,
        timestamp: new Date().toISOString(),
        stream: "stdout",
        message: chunk.toString()
      });
    });

    child.stderr.on("data", (chunk: Buffer) => {
      emitScriptLog({
        id: runId,
        timestamp: new Date().toISOString(),
        stream: "stderr",
        message: chunk.toString()
      });
    });

    child.on("error", (error: Error) => {
      emitScriptLog({
        id: runId,
        timestamp: new Date().toISOString(),
        stream: "stderr",
        message: error.message
      });
    });

    child.on("close", (exitCode: number | null) => {
      this.activeScripts.delete(runId);
      emitScriptLog({
        id: runId,
        timestamp: new Date().toISOString(),
        stream: exitCode === 0 ? "system" : "stderr",
        message: exitCode === 0 ? "Process finished." : `Process exited with code ${String(exitCode)}.`
      });
      onDone(runId, exitCode);
    });

    return runId;
  }

  stopScript(runId: string): boolean {
    const child = this.activeScripts.get(runId);
    if (!child) return false;
    child.kill("SIGTERM");
    this.activeScripts.delete(runId);
    return true;
  }

  runCommand(request: CommandRequest): Promise<CommandResult> {
    const { command, args, cwd } = request;
    const commandId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    ensureCommandAvailable(command);

    this.emitLog({
      id: commandId,
      timestamp: new Date().toISOString(),
      stream: "system",
      message: `> ${command} ${args.join(" ")}`
    });

    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        env: process.env,
        shell: process.platform === "win32"
      });

      child.stdout.on("data", (chunk) => {
        this.emitLog({
          id: commandId,
          timestamp: new Date().toISOString(),
          stream: "stdout",
          message: chunk.toString()
        });
      });

      child.stderr.on("data", (chunk) => {
        this.emitLog({
          id: commandId,
          timestamp: new Date().toISOString(),
          stream: "stderr",
          message: chunk.toString()
        });
      });

      child.on("error", (error) => {
        this.emitLog({
          id: commandId,
          timestamp: new Date().toISOString(),
          stream: "stderr",
          message: error.message
        });
        reject(error);
      });

      child.on("close", (exitCode) => {
        const success = exitCode === 0;

        this.emitLog({
          id: commandId,
          timestamp: new Date().toISOString(),
          stream: success ? "system" : "stderr",
          message: success
            ? "Command finished successfully."
            : `Command exited with code ${String(exitCode)}.`
        });

        resolve({
          success,
          exitCode
        });
      });
    });
  }
}
