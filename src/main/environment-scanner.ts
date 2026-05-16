import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { normalizeRuntimePath } from "./runtime-path";

const execFileAsync = promisify(execFile);

export interface NvmNodeVersion {
  version: string;
  lts: string | null;
  current: boolean;
}

export interface NvmVersionList {
  nvmAvailable: boolean;
  versions: NvmNodeVersion[];
}

export interface NvmInstallResult {
  success: boolean;
  output: string;
  platform: "macos" | "linux" | "windows" | "unknown";
}

export type ToolCategory = "nodejs" | "python" | "dotnet" | "system";

export interface DetectedTool {
  name: string;
  displayName: string;
  available: boolean;
  version: string | null;
  category: ToolCategory;
  installCommand: string | null;
  installNote: string | null;
  updateCommand: string | null;
}

export interface ToolUpdateInfo {
  hasUpdate: boolean;
  latestVersion: string | null;
  canCheck: boolean;
}

export interface ToolScanReport {
  tools: DetectedTool[];
}

// ---------------------------------------------------------------------------
// Probe helpers (all non-blocking)
// ---------------------------------------------------------------------------

async function probe(
  cmd: string,
  args: string[] = ["--version"]
): Promise<{ available: boolean; version: string | null }> {
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

function findNvmScript(): string | null {
  const candidates = [
    process.env.NVM_DIR ? join(process.env.NVM_DIR, "nvm.sh") : null,
    join(homedir(), ".nvm", "nvm.sh"),
    "/opt/homebrew/opt/nvm/nvm.sh",
    "/usr/local/opt/nvm/nvm.sh"
  ].filter(Boolean) as string[];

  return candidates.find(existsSync) ?? null;
}

function nvmSourceCmd(nvmScript: string): string {
  const nvmDir = nvmScript.replace(/\/nvm\.sh$/, "");
  return `export NVM_DIR="${nvmDir}" && source "${nvmScript}"`;
}

async function probeViaNvm(
  cmd: string
): Promise<{ available: boolean; version: string | null }> {
  const nvmScript = findNvmScript();
  const shell = process.platform === "darwin" ? "zsh" : "bash";

  if (nvmScript) {
    try {
      const { stdout, stderr } = await execFileAsync(
        shell,
        ["-l", "-c", `${nvmSourceCmd(nvmScript)} && ${cmd} --version`],
        { timeout: 6000, maxBuffer: 1024 * 1024 }
      );
      const raw = (stdout || stderr).trim().split("\n")[0].trim();
      if (raw) return { available: true, version: raw };
    } catch {
      // fall through to bare probe
    }
  }

  return probe(cmd);
}

async function probeNvm(): Promise<{ available: boolean; version: string | null }> {
  const nvmScript = findNvmScript();
  if (!nvmScript) return { available: false, version: null };

  const shell = process.platform === "darwin" ? "zsh" : "bash";
  try {
    const { stdout, stderr } = await execFileAsync(
      shell,
      ["-l", "-c", `${nvmSourceCmd(nvmScript)} && nvm --version`],
      { timeout: 6000, maxBuffer: 1024 * 1024 }
    );
    const raw = (stdout || stderr).trim();
    return { available: true, version: raw || null };
  } catch {
    return { available: false, version: null };
  }
}

// ---------------------------------------------------------------------------
// Tool builder
// ---------------------------------------------------------------------------

function getUpdateCommand(name: string): string | null {
  const mac = process.platform === "darwin";
  const linux = process.platform === "linux";

  switch (name) {
    case "npm":     return "npm install -g npm";
    case "yarn":    return "npm install -g yarn";
    case "pnpm":    return "npm install -g pnpm";
    case "bun":     return "bun upgrade";
    case "python3": return mac ? "brew upgrade python3" : linux ? "sudo apt upgrade -y python3" : null;
    case "pip3":    return "pip3 install --upgrade pip";
    case "dotnet":  return mac ? "brew upgrade --cask dotnet-sdk" : null;
    case "go":      return mac ? "brew upgrade go" : linux ? "sudo apt upgrade -y golang-go" : null;
    case "cargo":   return "rustup update";
    case "ruby":    return mac ? "brew upgrade ruby" : linux ? "sudo apt upgrade -y ruby" : null;
    case "git":     return mac ? "brew upgrade git" : linux ? "sudo apt upgrade -y git" : null;
    case "docker":  return mac ? "brew upgrade --cask docker" : null;
    case "nvm": {
      if (!mac && !linux) return null;
      return 'LATEST=$(curl -s "https://api.github.com/repos/nvm-sh/nvm/releases/latest" | grep \'"tag_name"\' | cut -d\'"\' -f4) && curl -o- "https://raw.githubusercontent.com/nvm-sh/nvm/${LATEST}/install.sh" | bash';
    }
    default: return null;
  }
}

function getInstallInfo(name: string): { command: string; note?: string } | null {
  const mac = process.platform === "darwin";
  const linux = process.platform === "linux";

  switch (name) {
    case "yarn":    return { command: "npm install -g yarn" };
    case "pnpm":    return { command: "npm install -g pnpm" };
    case "bun":     return { command: "curl -fsSL https://bun.sh/install | bash" };
    case "python3":
      if (mac)   return { command: "brew install python3" };
      if (linux) return { command: "sudo apt install -y python3" };
      return null;
    case "pip3":
      if (mac)   return { command: "brew install python3", note: "pip3 is included with Python 3" };
      if (linux) return { command: "sudo apt install -y python3-pip" };
      return null;
    case "dotnet":
      if (mac)   return { command: "brew install --cask dotnet-sdk" };
      return null;
    case "go":
      if (mac)   return { command: "brew install go" };
      if (linux) return { command: "sudo apt install -y golang-go" };
      return null;
    case "cargo":
      return { command: "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y" };
    case "ruby":
      if (mac)   return { command: "brew install ruby" };
      if (linux) return { command: "sudo apt install -y ruby" };
      return null;
    case "git":
      if (mac)   return { command: "brew install git" };
      if (linux) return { command: "sudo apt install -y git" };
      return null;
    case "docker":
      if (mac)   return { command: "brew install --cask docker", note: "Launch Docker Desktop after installation." };
      return null;
    default: return null;
  }
}

function tool(
  name: string,
  displayName: string,
  category: ToolCategory,
  status: { available: boolean; version: string | null }
): DetectedTool {
  const installInfo = status.available ? null : getInstallInfo(name);
  return {
    name,
    displayName,
    category,
    ...status,
    installCommand: installInfo?.command ?? null,
    installNote: installInfo?.note ?? null,
    updateCommand: status.available ? getUpdateCommand(name) : null
  };
}

// ---------------------------------------------------------------------------
// Scan — parallel execution, inflight dedup, short TTL cache
// ---------------------------------------------------------------------------

const SCAN_CACHE_TTL_MS = 30_000;

interface ScanCache {
  report: ToolScanReport;
  ts: number;
}

let scanCache: ScanCache | null = null;
let inflightScan: Promise<ToolScanReport> | null = null;

async function runFullScan(): Promise<ToolScanReport> {
  const [
    nodeStatus, nvmStatus, npmStatus, yarnStatus, pnpmStatus, bunStatus,
    python3Status, pip3Status, dotnetStatus, goStatus, cargoStatus, rubyStatus, gitStatus, dockerStatus
  ] = await Promise.all([
    probeViaNvm("node"),
    probeNvm(),
    probeViaNvm("npm"),
    probeViaNvm("yarn"),
    probeViaNvm("pnpm"),
    probeViaNvm("bun"),
    probe("python3"),
    probe("pip3"),
    probe("dotnet"),
    probe("go", ["version"]),
    probe("cargo"),
    probe("ruby"),
    probe("git"),
    probe("docker")
  ]);

  const report: ToolScanReport = {
    tools: [
      tool("node",    "Node.js",      "nodejs", nodeStatus),
      tool("nvm",     "nvm",          "nodejs", nvmStatus),
      tool("npm",     "npm",          "nodejs", npmStatus),
      tool("yarn",    "Yarn",         "nodejs", yarnStatus),
      tool("pnpm",    "pnpm",         "nodejs", pnpmStatus),
      tool("bun",     "Bun",          "nodejs", bunStatus),
      tool("python3", "Python 3",     "python", python3Status),
      tool("pip3",    "pip",          "python", pip3Status),
      tool("dotnet",  ".NET SDK",     "dotnet", dotnetStatus),
      tool("go",      "Go",           "system", goStatus),
      tool("cargo",   "Rust / Cargo", "system", cargoStatus),
      tool("ruby",    "Ruby",         "system", rubyStatus),
      tool("git",     "Git",          "system", gitStatus),
      tool("docker",  "Docker",       "system", dockerStatus)
    ]
  };

  scanCache = { report, ts: Date.now() };
  return report;
}

export async function scanTools(force = false): Promise<ToolScanReport> {
  if (!force && scanCache && Date.now() - scanCache.ts < SCAN_CACHE_TTL_MS) {
    return scanCache.report;
  }

  if (!force && inflightScan) return inflightScan;

  const scan = runFullScan();
  inflightScan = scan;
  scan.finally(() => { if (inflightScan === scan) inflightScan = null; });
  return scan;
}

// ---------------------------------------------------------------------------
// Single-tool probe
// ---------------------------------------------------------------------------

export async function probeSingleTool(name: string): Promise<DetectedTool | null> {
  let updated: DetectedTool | null = null;

  switch (name) {
    case "node":    updated = tool("node",    "Node.js",      "nodejs", await probeViaNvm("node")); break;
    case "nvm":     updated = tool("nvm",     "nvm",          "nodejs", await probeNvm()); break;
    case "npm":     updated = tool("npm",     "npm",          "nodejs", await probeViaNvm("npm")); break;
    case "yarn":    updated = tool("yarn",    "Yarn",         "nodejs", await probeViaNvm("yarn")); break;
    case "pnpm":    updated = tool("pnpm",    "pnpm",         "nodejs", await probeViaNvm("pnpm")); break;
    case "bun":     updated = tool("bun",     "Bun",          "nodejs", await probeViaNvm("bun")); break;
    case "python3": updated = tool("python3", "Python 3",     "python", await probe("python3")); break;
    case "pip3":    updated = tool("pip3",    "pip",          "python", await probe("pip3")); break;
    case "dotnet":  updated = tool("dotnet",  ".NET SDK",     "dotnet", await probe("dotnet")); break;
    case "go":      updated = tool("go",      "Go",           "system", await probe("go", ["version"])); break;
    case "cargo":   updated = tool("cargo",   "Rust / Cargo", "system", await probe("cargo")); break;
    case "ruby":    updated = tool("ruby",    "Ruby",         "system", await probe("ruby")); break;
    case "git":     updated = tool("git",     "Git",          "system", await probe("git")); break;
    case "docker":  updated = tool("docker",  "Docker",       "system", await probe("docker")); break;
    default: return null;
  }

  if (updated && scanCache) {
    scanCache = {
      report: { tools: scanCache.report.tools.map((t) => (t.name === name ? updated! : t)) },
      ts: scanCache.ts
    };
  }

  return updated;
}

// ---------------------------------------------------------------------------
// Tool update check
// ---------------------------------------------------------------------------

function nvmShell(): { shell: string; nvmScript: string } | null {
  const nvmScript = findNvmScript();
  if (!nvmScript) return null;
  const shell = process.platform === "darwin" ? "zsh" : "bash";
  return { shell, nvmScript };
}

export async function checkToolUpdate(toolName: string, currentVersion: string): Promise<ToolUpdateInfo> {
  const shell = process.platform === "darwin" ? "zsh" : "bash";
  const norm = (v: string) => v.replace(/^v/, "").trim();

  if (["npm", "yarn", "pnpm"].includes(toolName)) {
    const nvm = nvmShell();
    const prefix = nvm ? `${nvmSourceCmd(nvm.nvmScript)} && ` : "";
    const major = norm(currentVersion).split(".")[0];
    const tag = major ? `${toolName}@${major}` : toolName;
    try {
      const { stdout } = await execFileAsync(
        shell,
        ["-l", "-c", `${prefix}npm view ${tag} version`],
        { timeout: 10000, maxBuffer: 1024 * 1024 }
      );
      const latest = stdout.trim().split("\n")[0].trim();
      if (!latest) return { hasUpdate: false, latestVersion: null, canCheck: false };
      return { hasUpdate: norm(latest) !== norm(currentVersion), latestVersion: latest, canCheck: true };
    } catch {
      return { hasUpdate: false, latestVersion: null, canCheck: false };
    }
  }

  if (toolName === "nvm") {
    try {
      const { stdout } = await execFileAsync(
        "curl",
        ["-s", "https://api.github.com/repos/nvm-sh/nvm/releases/latest"],
        { timeout: 8000, maxBuffer: 1024 * 1024 }
      );
      const match = stdout.match(/"tag_name"\s*:\s*"v?([^"]+)"/);
      const latest = match?.[1] ?? null;
      if (!latest) return { hasUpdate: false, latestVersion: null, canCheck: false };
      return { hasUpdate: norm(latest) !== norm(currentVersion), latestVersion: latest, canCheck: true };
    } catch {
      return { hasUpdate: false, latestVersion: null, canCheck: false };
    }
  }

  if (toolName === "bun" || toolName === "pip3") {
    return { hasUpdate: true, latestVersion: null, canCheck: false };
  }

  if (toolName === "cargo") {
    try {
      const { stdout } = await execFileAsync(shell, ["-l", "-c", "rustup check"], {
        timeout: 15000,
        maxBuffer: 1024 * 1024
      });
      return { hasUpdate: stdout.includes("Update available"), latestVersion: null, canCheck: true };
    } catch {
      return { hasUpdate: false, latestVersion: null, canCheck: false };
    }
  }

  const brewFormulas: Record<string, string> = {
    python3: "python3", go: "go", ruby: "ruby",
    git: "git", dotnet: "dotnet-sdk", docker: "docker"
  };

  if (toolName in brewFormulas) {
    try {
      const { stdout } = await execFileAsync(
        "zsh",
        ["-l", "-c", `brew outdated ${brewFormulas[toolName]} --verbose`],
        { timeout: 20000, maxBuffer: 1024 * 1024 }
      );
      const out = stdout.trim();
      const match = out.match(/\S+\s+(\S+)\s+<\s+(\S+)/);
      return { hasUpdate: out.length > 0, latestVersion: match?.[2] ?? null, canCheck: true };
    } catch {
      return { hasUpdate: false, latestVersion: null, canCheck: false };
    }
  }

  return { hasUpdate: false, latestVersion: null, canCheck: false };
}

// ---------------------------------------------------------------------------
// Install / update / nvm actions
// ---------------------------------------------------------------------------

export async function installTool(toolName: string): Promise<NvmActionResult> {
  const info = getInstallInfo(toolName);
  if (!info) return { success: false, output: "No install method available for this tool on your platform." };

  const shell = process.platform === "darwin" ? "zsh" : "bash";
  const needsNvm = ["yarn", "pnpm"].includes(toolName);
  const nvmPrefix = needsNvm
    ? (() => { const s = findNvmScript(); return s ? `${nvmSourceCmd(s)} && ` : ""; })()
    : "";

  try {
    const { stdout, stderr } = await execFileAsync(
      shell,
      ["-l", "-c", `${nvmPrefix}${info.command}`],
      { timeout: 120_000, maxBuffer: 10 * 1024 * 1024 }
    );
    return { success: true, output: [stdout, stderr].filter(Boolean).join("\n").trim() };
  } catch (err) {
    return { success: false, output: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateTool(toolName: string): Promise<NvmActionResult> {
  const command = getUpdateCommand(toolName);
  if (!command) return { success: false, output: "No update method available for this tool on your platform." };

  const shell = process.platform === "darwin" ? "zsh" : "bash";
  const needsNvm = ["npm", "yarn", "pnpm", "pip3"].includes(toolName);
  const nvmPrefix = needsNvm
    ? (() => { const s = findNvmScript(); return s ? `${nvmSourceCmd(s)} && ` : ""; })()
    : "";

  try {
    const { stdout, stderr } = await execFileAsync(
      shell,
      ["-l", "-c", `${nvmPrefix}${command}`],
      { timeout: 120_000, maxBuffer: 10 * 1024 * 1024 }
    );
    return { success: true, output: [stdout, stderr].filter(Boolean).join("\n").trim() };
  } catch (err) {
    return { success: false, output: err instanceof Error ? err.message : String(err) };
  }
}

export async function listNvmVersions(): Promise<NvmVersionList> {
  const nvm = nvmShell();
  if (!nvm) return { nvmAvailable: false, versions: [] };

  try {
    const { stdout } = await execFileAsync(
      nvm.shell,
      ["-l", "-c", `${nvmSourceCmd(nvm.nvmScript)} && nvm ls --no-colors`],
      { timeout: 8000, maxBuffer: 1024 * 1024 }
    );
    return { nvmAvailable: true, versions: parseNvmLs(stdout ?? "") };
  } catch {
    return { nvmAvailable: true, versions: [] };
  }
}

export async function nvmSetDefault(version: string): Promise<NvmActionResult> {
  const nvm = nvmShell();
  if (!nvm) return { success: false, output: "nvm not found" };

  try {
    const { stdout, stderr } = await execFileAsync(
      nvm.shell,
      ["-l", "-c", `${nvmSourceCmd(nvm.nvmScript)} && nvm alias default ${version} --no-colors`],
      { timeout: 8000, maxBuffer: 1024 * 1024 }
    );
    return { success: true, output: [stdout, stderr].filter(Boolean).join("\n").trim() };
  } catch (err) {
    return { success: false, output: err instanceof Error ? err.message : String(err) };
  }
}

export async function nvmUse(version: string): Promise<NvmActionResult> {
  const nvm = nvmShell();
  if (!nvm) return { success: false, output: "nvm not found" };

  try {
    // Run `nvm use` then print the resulting PATH so we can propagate it to
    // the Electron process — this ensures all subsequent spawn calls inherit
    // the newly selected Node version.
    const { stdout, stderr } = await execFileAsync(
      nvm.shell,
      ["-l", "-c", `${nvmSourceCmd(nvm.nvmScript)} && nvm use ${version} --no-colors && printf "\\nNVM_NEW_PATH:%s\\n" "$PATH"`],
      { timeout: 10000, maxBuffer: 1024 * 1024 }
    );

    const combined = [stdout, stderr].filter(Boolean).join("\n");

    const pathMatch = combined.match(/NVM_NEW_PATH:(.+)/);
    if (pathMatch?.[1]) {
      process.env.PATH = pathMatch[1].trim();
    }

    const output = combined.replace(/NVM_NEW_PATH:.+/g, "").trim();
    return { success: true, output };
  } catch (err) {
    return { success: false, output: err instanceof Error ? err.message : String(err) };
  }
}

export async function installNvm(): Promise<NvmInstallResult> {
  if (process.platform === "win32") {
    return {
      success: false,
      output: "Windows detected. Please install nvm-windows manually from https://github.com/coreybutler/nvm-windows",
      platform: "windows"
    };
  }

  const platform = process.platform === "darwin" ? "macos" : "linux";
  const shell = process.platform === "darwin" ? "zsh" : "bash";
  const installUrl = "https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh";

  try {
    const { stdout, stderr } = await execFileAsync(
      shell,
      ["-l", "-c", `curl -o- "${installUrl}" | bash`],
      { timeout: 90_000, maxBuffer: 10 * 1024 * 1024 }
    );
    return { success: true, output: [stdout, stderr].filter(Boolean).join("\n").trim(), platform };
  } catch (err) {
    return { success: false, output: err instanceof Error ? err.message : String(err), platform };
  }
}

// ---------------------------------------------------------------------------
// NVM version list helpers
// ---------------------------------------------------------------------------

function parseNvmLs(output: string): NvmNodeVersion[] {
  const lines = output.split("\n");

  const ltsMap = new Map<string, string>();
  for (const line of lines) {
    const m = line.match(/^\s*lts\/(\w+)\s+->\s+(v\d+\.\d+\.\d+)/i);
    if (m) ltsMap.set(m[2], capitalize(m[1]));
  }

  const versions: NvmNodeVersion[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const currentMatch = line.match(/^->\s+(v\d+\.\d+\.\d+)(?:\s+\(lts\/(\w+)\))?/i);
    const normalMatch = !currentMatch
      ? line.match(/^\s+(v\d+\.\d+\.\d+)(?:\s+\(lts\/(\w+)\))?/i)
      : null;
    const match = currentMatch ?? normalMatch;
    if (!match) continue;

    const version = match[1];
    if (seen.has(version)) continue;
    seen.add(version);

    const ltsFromLine = match[2] ? capitalize(match[2]) : null;
    versions.push({
      version,
      lts: ltsFromLine ?? ltsMap.get(version) ?? null,
      current: !!currentMatch
    });
  }

  return versions.sort((a, b) => compareNodeVersions(b.version, a.version));
}

function compareNodeVersions(a: string, b: string): number {
  const parse = (v: string) => v.replace(/^v/, "").split(".").map(Number) as [number, number, number];
  const [aMaj, aMin, aPat] = parse(a);
  const [bMaj, bMin, bPat] = parse(b);
  return aMaj - bMaj || aMin - bMin || aPat - bPat;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export interface NvmActionResult {
  success: boolean;
  output: string;
}

// ---------------------------------------------------------------------------
// Port scanning
// ---------------------------------------------------------------------------

export interface ListeningPort {
  pid: number;
  port: number;
  command: string;
  address: string;
}

export async function scanListeningPorts(): Promise<ListeningPort[]> {
  try {
    // -i TCP  : TCP sockets only
    // -sTCP:LISTEN : only LISTEN state
    // -P      : show port numbers (not service names)
    // -n      : no hostname resolution
    const { stdout } = await execFileAsync(
      "lsof", ["-i", "TCP", "-sTCP:LISTEN", "-P", "-n"],
      { timeout: 4000, maxBuffer: 2 * 1024 * 1024 }
    );

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

    return results.sort((a, b) => a.port - b.port);
  } catch {
    return [];
  }
}

// Returns a Map<childPid, parentPid> for the entire process table.
export async function buildProcessTree(): Promise<Map<number, number>> {
  try {
    const { stdout } = await execFileAsync(
      "ps", ["-eo", "pid,ppid"],
      { timeout: 3000, maxBuffer: 2 * 1024 * 1024 }
    );

    const tree = new Map<number, number>();
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
