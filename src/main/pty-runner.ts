import path from "node:path";
import type { ScriptStatusEvent } from "../renderer/shared/types/lazify";

export interface PtyDataEvent {
  runId: string;
  data: string;
}

export interface PtySessionInfo {
  runId: string;
  scriptName: string;
  projectPath: string;
  projectName: string;
  pid: number;
  startedAt: string;
}

type DataEmitter   = (event: PtyDataEvent) => void;
type StatusEmitter = (event: ScriptStatusEvent) => void;

// Lazy-load so a missing rebuild doesn't crash the whole app on startup.
function loadNodePty(): typeof import("node-pty") | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("node-pty") as typeof import("node-pty");
  } catch {
    return null;
  }
}

interface PtyEntry {
  pty: import("node-pty").IPty;
  scriptName: string;
  projectPath: string;
  projectName: string;
  startedAt: string;
}

export class PtyRunner {
  private readonly entries = new Map<string, PtyEntry>();
  private readonly nodePty = loadNodePty();

  readonly available: boolean;

  constructor(
    private readonly emitData: DataEmitter,
    private readonly emitStatus: StatusEmitter
  ) {
    this.available = this.nodePty !== null;
  }

  start(command: string, args: string[], cwd: string, scriptName: string, cols = 220, rows = 50): string {
    if (!this.nodePty) throw new Error("node-pty is not available. Run: npm run rebuild");

    const runId = `pty-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    const instance = this.nodePty.spawn(command, args, {
      name: "xterm-256color",
      cols,
      rows,
      cwd,
      env: { ...process.env } as Record<string, string>
    });

    this.entries.set(runId, {
      pty: instance,
      scriptName,
      projectPath: cwd,
      projectName: path.basename(cwd),
      startedAt: new Date().toISOString()
    });

    instance.onData((data) => this.emitData({ runId, data }));

    instance.onExit(({ exitCode }) => {
      this.entries.delete(runId);
      this.emitStatus({
        runId,
        scriptName,
        status: exitCode === 0 ? "done" : "error",
        exitCode
      });
    });

    this.emitStatus({ runId, scriptName, status: "running", exitCode: null });
    return runId;
  }

  getSessions(): PtySessionInfo[] {
    return Array.from(this.entries.entries()).map(([runId, entry]) => ({
      runId,
      scriptName: entry.scriptName,
      projectPath: entry.projectPath,
      projectName: entry.projectName,
      pid: entry.pty.pid,
      startedAt: entry.startedAt
    }));
  }

  write(runId: string, data: string): void {
    this.entries.get(runId)?.pty.write(data);
  }

  resize(runId: string, cols: number, rows: number): void {
    try {
      this.entries.get(runId)?.pty.resize(cols, rows);
    } catch {
      // PTY may have exited between the resize and the call
    }
  }

  kill(runId: string): void {
    const entry = this.entries.get(runId);
    if (!entry) return;
    entry.pty.kill();
    this.entries.delete(runId);
  }
}
