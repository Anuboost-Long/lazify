import path from "node:path";
import type { ScriptStatusEvent } from "../renderer/shared/types/lazify";

export interface PtyDataEvent {
  runId: string;
  data: string;
  /** Per-session chunk index, so a re-attaching terminal can drop replayed chunks. */
  seq?: number;
}

export interface PtyBacklog {
  data: string;
  /** Sequence of the last chunk contained in `data`. */
  seq: number;
}

/** Keeps roughly the last few thousand lines of output for re-attach. */
const BACKLOG_LIMIT_BYTES = 512_000;

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
  /** Output buffered for terminals that attach (or re-attach) later. */
  backlog: string[];
  backlogBytes: number;
  seq: number;
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

  start(command: string, args: string[], cwd: string, scriptName: string, cols = 220, rows = 50, extraEnv: Record<string, string> = {}): string {
    if (!this.nodePty) throw new Error("node-pty is not available. Run: npm run rebuild");

    const runId = `pty-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    const instance = this.nodePty.spawn(command, args, {
      name: "xterm-256color",
      cols,
      rows,
      cwd,
      env: { ...process.env, ...extraEnv } as Record<string, string>
    });

    const entry: PtyEntry = {
      pty: instance,
      scriptName,
      projectPath: cwd,
      projectName: path.basename(cwd),
      startedAt: new Date().toISOString(),
      backlog: [],
      backlogBytes: 0,
      seq: 0
    };

    this.entries.set(runId, entry);

    instance.onData((data) => {
      entry.seq += 1;
      entry.backlog.push(data);
      entry.backlogBytes += data.length;

      // Trim whole chunks from the front so escape sequences stay intact.
      while (entry.backlogBytes > BACKLOG_LIMIT_BYTES && entry.backlog.length > 1) {
        entry.backlogBytes -= entry.backlog.shift()!.length;
      }

      this.emitData({ runId, data, seq: entry.seq });
    });

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

  /** Everything the session has printed so far, for a terminal attaching now. */
  getBacklog(runId: string): PtyBacklog {
    const entry = this.entries.get(runId);

    if (!entry) {
      return { data: "", seq: 0 };
    }

    return { data: entry.backlog.join(""), seq: entry.seq };
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
