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
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[pty-runner] node-pty failed to load:", err);
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

  /**
   * node-pty's Windows backend hands the command straight to CreateProcess,
   * which — unlike a shell — never consults PATHEXT. npm/yarn/pnpm are `.cmd`
   * shims there, so spawning the bare name fails immediately with "Cannot
   * create process, error code: 2" and the terminal never shows a thing.
   * Routing through cmd.exe restores the PATH/extension resolution a shell
   * would normally do.
   */
  private resolveSpawnTarget(command: string, args: string[]): [string, string[]] {
    if (process.platform !== "win32") return [command, args];
    return ["cmd.exe", ["/c", command, ...args]];
  }

  start(command: string, args: string[], cwd: string, scriptName: string, cols = 220, rows = 50, extraEnv: Record<string, string> = {}): string {
    if (!this.nodePty) throw new Error("node-pty is not available. Run: npm run rebuild");

    const runId = `pty-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    const [spawnCommand, spawnArgs] = this.resolveSpawnTarget(command, args);

    const instance = this.nodePty.spawn(spawnCommand, spawnArgs, {
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

  /**
   * Signals the whole process group rather than just the process we spawned.
   *
   * The thing in the PTY is usually a wrapper — `dotnet watch` runs the real
   * server as a child, as do `npm run` and friends. Killing only the wrapper
   * orphans that child, which keeps holding the dev port and makes the next
   * start fail with "address already in use". node-pty gives the session its
   * own process group, so negating the pid takes the children down too.
   */
  private signalGroup(pid: number, signal: NodeJS.Signals): void {
    try {
      process.kill(-pid, signal);
    } catch {
      // No group (or already gone) — fall back to the single process.
      try {
        process.kill(pid, signal);
      } catch {
        // Already dead; nothing to do.
      }
    }
  }

  kill(runId: string): void {
    const entry = this.entries.get(runId);
    if (!entry) return;

    if (process.platform === "win32") {
      entry.pty.kill();
    } else {
      this.signalGroup(entry.pty.pid, "SIGTERM");
    }

    this.entries.delete(runId);
  }

  /**
   * Kills and waits for the process to actually be gone, which a restart needs
   * — respawning while the old server still holds its port fails with "address
   * already in use". Escalates to SIGKILL if the group ignores SIGTERM, and
   * resolves regardless once `timeoutMs` is up so a process that refuses to
   * die cannot wedge the restart.
   */
  killAndWait(runId: string, timeoutMs = 5000): Promise<void> {
    const entry = this.entries.get(runId);
    if (!entry) return Promise.resolve();

    const { pid } = entry.pty;
    const onWindows = process.platform === "win32";

    return new Promise<void>((resolve) => {
      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(escalateTimer);
        clearTimeout(giveUpTimer);
        resolve();
      };

      const escalateTimer = setTimeout(() => {
        if (!onWindows) this.signalGroup(pid, "SIGKILL");
      }, Math.min(2000, timeoutMs));

      const giveUpTimer = setTimeout(finish, timeoutMs);

      entry.pty.onExit(finish);

      if (onWindows) {
        entry.pty.kill();
      } else {
        this.signalGroup(pid, "SIGTERM");
      }
    }).then(() => {
      this.entries.delete(runId);
    });
  }
}
