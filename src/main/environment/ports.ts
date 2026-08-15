import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface ListeningPort {
  pid: number;
  port: number;
  command: string;
  address: string;
}

const onWindows = () => process.platform === "win32";

/**
 * A PowerShell pipeline, asked for CSV.
 *
 * Everything this file needs from Windows — listening sockets, the process
 * table, each process's command line — used to come from `netstat` and `wmic`.
 * wmic is deprecated and gone from recent Windows 11, and netstat translates
 * its own state column on a localised install. The PowerShell cmdlets are the
 * supported replacements and are locale-independent, and CSV is the shape of
 * their output that parses without a table-width guess.
 */
async function powershellCsv(pipeline: string): Promise<string[][]> {
  const { stdout } = await execFileAsync(
    "powershell",
    ["-NoProfile", "-NonInteractive", "-Command", `${pipeline} | ConvertTo-Csv -NoTypeInformation`],
    { timeout: 8000, maxBuffer: 4 * 1024 * 1024, windowsHide: true }
  );

  return stdout
    .split("\n")
    .slice(1) // the header row
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split('","').map((cell) => cell.replace(/^"|"$/g, "")));
}

/** The process table, the one way of asking for it that is still supported. */
const cimProcesses = (select: string) =>
  powershellCsv(`Get-CimInstance Win32_Process | Select-Object ${select}`);

// ---------------------------------------------------------------------------
// Port scanning
// ---------------------------------------------------------------------------

/** `lsof -i TCP -sTCP:LISTEN -P -n`, the macOS answer and the first Linux one. */
function parseLsof(stdout: string): ListeningPort[] {
  const results: ListeningPort[] = [];
  const seen = new Set<string>();

  for (const line of stdout.split("\n").slice(1)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 9) continue;

    const command = parts[0];
    const pid     = parseInt(parts[1], 10);
    const name    = parts[8]; // e.g. "*:3000", "127.0.0.1:8080", "[::]:5173"

    const portMatch = name.match(/:(\d+)$/);
    if (!portMatch || isNaN(pid)) continue;

    const port    = parseInt(portMatch[1], 10);
    const address = name.slice(0, name.lastIndexOf(":")) || "*";
    const key     = `${pid}:${port}`;

    if (!seen.has(key)) {
      seen.add(key);
      results.push({ pid, port, command, address });
    }
  }

  return results;
}

/**
 * `ss -ltnp`, for the Linux boxes without lsof — it is not in a minimal install
 * of most distros, where iproute2 always is.
 *
 *   LISTEN 0 511 0.0.0.0:3000 0.0.0.0:* users:(("node",pid=1234,fd=20))
 */
function parseSs(stdout: string): ListeningPort[] {
  const results: ListeningPort[] = [];
  const seen = new Set<string>();

  for (const line of stdout.split("\n").slice(1)) {
    const columns = line.trim().split(/\s+/);
    if (columns.length < 4) continue;

    const local = columns[3];
    const portMatch = local.match(/:(\d+)$/);
    if (!portMatch) continue;

    // The process column is absent for sockets owned by another user.
    const owner = line.match(/users:\(\("([^"]+)",pid=(\d+)/);
    const pid = owner ? parseInt(owner[2], 10) : 0;
    if (!pid) continue;

    const port = parseInt(portMatch[1], 10);
    const key = `${pid}:${port}`;
    if (seen.has(key)) continue;

    seen.add(key);
    results.push({
      pid,
      port,
      command: owner?.[1] ?? "unknown",
      address: local.slice(0, local.lastIndexOf(":")) || "*"
    });
  }

  return results;
}

/**
 * Windows, in preference order: Get-NetTCPConnection, then netstat.
 *
 * The cmdlet is the better answer — it names the state rather than printing a
 * word that a German or French install would translate — but it is a module
 * that a locked-down machine can be missing, and netstat is always there. The
 * fallback identifies a listener by its empty foreign address instead of by the
 * state column, so it does not care what language that column is in.
 */
async function scanWindowsPorts(): Promise<ListeningPort[]> {
  const names = await readProcessNames();

  const collect = (rows: Array<{ address: string; port: number; pid: number }>) => {
    const results: ListeningPort[] = [];
    const seen = new Set<string>();

    for (const row of rows) {
      const key = `${row.pid}:${row.port}`;
      if (seen.has(key)) continue;

      seen.add(key);
      results.push({ ...row, command: names.get(row.pid) ?? "unknown" });
    }

    return results;
  };

  try {
    const rows = await powershellCsv(
      "Get-NetTCPConnection -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess"
    );

    return collect(
      rows
        .map(([address, port, pid]) => ({
          address: address || "*",
          port: parseInt(port, 10),
          pid: parseInt(pid, 10)
        }))
        .filter((row) => !isNaN(row.port) && !isNaN(row.pid))
    );
  } catch {
    // TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    1234
    const { stdout } = await execFileAsync("netstat", ["-ano", "-p", "TCP"], {
      timeout: 6000,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true
    });

    const rows: Array<{ address: string; port: number; pid: number }> = [];

    for (const line of stdout.split("\n")) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 5 || parts[0].toUpperCase() !== "TCP") continue;

      // A listening socket is the one with no peer on the other end.
      if (!/:0$/.test(parts[2])) continue;

      const portMatch = parts[1].match(/:(\d+)$/);
      const pid = parseInt(parts[4], 10);
      if (!portMatch || isNaN(pid)) continue;

      rows.push({
        address: parts[1].slice(0, parts[1].lastIndexOf(":")) || "*",
        port: parseInt(portMatch[1], 10),
        pid
      });
    }

    return collect(rows);
  }
}

/** pid -> executable name, for the netstat rows that only carry a pid. */
async function readProcessNames(): Promise<Map<number, string>> {
  const names = new Map<number, string>();

  try {
    const { stdout } = await execFileAsync("tasklist", ["/fo", "csv", "/nh"], {
      timeout: 6000,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true
    });

    for (const line of stdout.split("\n")) {
      const cells = line.trim().split('","').map((cell) => cell.replace(/^"|"$/g, ""));
      const pid = parseInt(cells[1], 10);
      if (cells[0] && !isNaN(pid)) names.set(pid, cells[0]);
    }
  } catch {
    // Names are a label; the rows are still usable without them.
  }

  return names;
}

/**
 * Everything listening on a TCP port, however this OS is willing to say it.
 *
 * Each backend answers the same question with a different tool, and every one
 * of them can be missing — so a failure here is an empty list rather than an
 * error. The pane above it reads "nothing is listening", which is wrong but
 * harmless; what it must never do is take the app down for a missing binary.
 */
export async function scanListeningPorts(): Promise<ListeningPort[]> {
  try {
    if (onWindows()) {
      return (await scanWindowsPorts()).sort((a, b) => a.port - b.port);
    }

    try {
      // -i TCP  : TCP sockets only
      // -sTCP:LISTEN : only LISTEN state
      // -P      : show port numbers (not service names)
      // -n      : no hostname resolution
      const { stdout } = await execFileAsync(
        "lsof", ["-i", "TCP", "-sTCP:LISTEN", "-P", "-n"],
        { timeout: 4000, maxBuffer: 2 * 1024 * 1024 }
      );
      return parseLsof(stdout).sort((a, b) => a.port - b.port);
    } catch {
      if (process.platform !== "linux") throw new Error("lsof unavailable");

      const { stdout } = await execFileAsync("ss", ["-ltnp"], {
        timeout: 4000,
        maxBuffer: 2 * 1024 * 1024
      });
      return parseSs(stdout).sort((a, b) => a.port - b.port);
    }
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Process table
// ---------------------------------------------------------------------------

// Returns a Map<childPid, parentPid> for the entire process table.
export async function buildProcessTree(): Promise<Map<number, number>> {
  const tree = new Map<number, number>();

  try {
    if (onWindows()) {
      for (const [pid, ppid] of await cimProcesses("ProcessId,ParentProcessId")) {
        const child = parseInt(pid, 10);
        const parent = parseInt(ppid, 10);
        if (!isNaN(child) && !isNaN(parent)) tree.set(child, parent);
      }

      return tree;
    }

    const { stdout } = await execFileAsync(
      "ps", ["-eo", "pid,ppid"],
      { timeout: 3000, maxBuffer: 2 * 1024 * 1024 }
    );

    for (const line of stdout.split("\n").slice(1)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const pid  = parseInt(parts[0], 10);
        const ppid = parseInt(parts[1], 10);
        if (!isNaN(pid) && !isNaN(ppid)) tree.set(pid, ppid);
      }
    }

    return tree;
  } catch {
    return new Map();
  }
}

/**
 * pid -> full command line, so a row reading `node` can say which node.
 *
 * One call for the whole table rather than one per row: the list is rebuilt
 * on every poll, and a process spawn per listening port is not free.
 */
export async function readCommandLines(): Promise<Map<number, string>> {
  const lines = new Map<number, string>();

  try {
    if (onWindows()) {
      for (const [pid, commandLine] of await cimProcesses("ProcessId,CommandLine")) {
        const parsed = parseInt(pid, 10);
        if (!isNaN(parsed) && commandLine) lines.set(parsed, commandLine);
      }

      return lines;
    }

    const { stdout } = await execFileAsync("ps", ["-eo", "pid=,command="], {
      timeout: 4000,
      maxBuffer: 4 * 1024 * 1024
    });

    for (const row of stdout.split("\n")) {
      const match = row.trim().match(/^(\d+)\s+(.*)$/);
      if (match) lines.set(Number(match[1]), match[2]);
    }
  } catch {
    // Without argv the list still works, just with terser labels.
  }

  return lines;
}

// Returns the set of all descendant PIDs (inclusive of rootPid).
export function getDescendantPids(rootPid: number, tree: Map<number, number>): Set<number> {
  const result = new Set<number>([rootPid]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [child, parent] of tree) {
      if (result.has(parent) && !result.has(child)) {
        result.add(child);
        changed = true;
      }
    }
  }
  return result;
}
