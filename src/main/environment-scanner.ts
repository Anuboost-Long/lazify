import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

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

function probe(cmd: string, args: string[] = ["--version"]): { available: boolean; version: string | null } {
  const result = spawnSync(cmd, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
    timeout: 5000
  });

  if (result.error || result.status !== 0) {
    return { available: false, version: null };
  }

  const raw = (result.stdout || result.stderr).trim();
  return { available: !!raw, version: raw || null };
}

function findNvmScript(): string | null {
  const candidates = [
    process.env.NVM_DIR ? join(process.env.NVM_DIR, "nvm.sh") : null,
    join(homedir(), ".nvm", "nvm.sh"),
    "/opt/homebrew/opt/nvm/nvm.sh",
    "/usr/local/opt/nvm/nvm.sh",
  ].filter(Boolean) as string[];

  return candidates.find(existsSync) ?? null;
}

function nvmSourceCmd(nvmScript: string): string {
  const nvmDir = nvmScript.replace(/\/nvm\.sh$/, "");
  return `export NVM_DIR="${nvmDir}" && source "${nvmScript}"`;
}

function probeViaNvm(cmd: string): { available: boolean; version: string | null } {
  const nvmScript = findNvmScript();
  const shell = process.platform === "darwin" ? "zsh" : "bash";

  if (nvmScript) {
    const result = spawnSync(
      shell,
      ["-l", "-c", `${nvmSourceCmd(nvmScript)} && ${cmd} --version`],
      { encoding: "utf8", timeout: 6000 }
    );
    if (!result.error && result.status === 0) {
      const raw = (result.stdout || result.stderr).trim().split("\n")[0].trim();
      if (raw) return { available: true, version: raw };
    }
  }

  // Fall back to bare probe if nvm not found or command failed
  return probe(cmd);
}

function probeNvm(): { available: boolean; version: string | null } {
  const nvmScript = findNvmScript();
  if (!nvmScript) return { available: false, version: null };

  const shell = process.platform === "darwin" ? "zsh" : "bash";
  const result = spawnSync(
    shell,
    ["-l", "-c", `${nvmSourceCmd(nvmScript)} && nvm --version`],
    { encoding: "utf8", timeout: 6000 }
  );

  const raw = (result.stdout || result.stderr).trim();
  return { available: true, version: raw || null };
}

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
      // Fetch the latest tag from GitHub and re-run the install script against it
      return 'LATEST=$(curl -s "https://api.github.com/repos/nvm-sh/nvm/releases/latest" | grep \'"tag_name"\' | cut -d\'"\' -f4) && curl -o- "https://raw.githubusercontent.com/nvm-sh/nvm/${LATEST}/install.sh" | bash';
    }
    default:        return null;
  }
}

function getInstallInfo(name: string): { command: string; note?: string } | null {
  const mac = process.platform === "darwin";
  const linux = process.platform === "linux";

  switch (name) {
    case "yarn":  return { command: "npm install -g yarn" };
    case "pnpm":  return { command: "npm install -g pnpm" };
    case "bun":   return { command: "curl -fsSL https://bun.sh/install | bash" };
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
    default:
      return null;
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
    updateCommand: status.available ? getUpdateCommand(name) : null,
  };
}

export function installTool(toolName: string): NvmActionResult {
  const info = getInstallInfo(toolName);
  if (!info) return { success: false, output: "No install method available for this tool on your platform." };

  const shell = process.platform === "darwin" ? "zsh" : "bash";

  // npm-based installs need node/npm in PATH — source nvm first if available
  const needsNvm = ["yarn", "pnpm"].includes(toolName);
  const nvmPrefix = needsNvm
    ? (() => { const s = findNvmScript(); return s ? `${nvmSourceCmd(s)} && ` : ""; })()
    : "";

  const result = spawnSync(
    shell,
    ["-l", "-c", `${nvmPrefix}${info.command}`],
    { encoding: "utf8", timeout: 120000 }
  );

  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  if (result.error) return { success: false, output: result.error.message };
  return { success: result.status === 0, output };
}

export function checkToolUpdate(toolName: string, currentVersion: string): ToolUpdateInfo {
  const shell = process.platform === "darwin" ? "zsh" : "bash";
  const norm = (v: string) => v.replace(/^v/, "").trim();

  if (["npm", "yarn", "pnpm"].includes(toolName)) {
    const nvm = nvmShell();
    const prefix = nvm ? `${nvmSourceCmd(nvm.nvmScript)} && ` : "";
    // Use the same major series to avoid false positives (e.g. npm 10.x vs 11.x)
    const major = norm(currentVersion)?.split(".")[0];
    const tag = major ? `${toolName}@${major}` : toolName;
    const r = spawnSync(shell, ["-l", "-c", `${prefix}npm view ${tag} version`], { encoding: "utf8", timeout: 10000 });
    const latest = r.stdout?.trim().split("\n")[0].trim() ?? null;
    if (!latest || r.error) return { hasUpdate: false, latestVersion: null, canCheck: false };
    return { hasUpdate: norm(latest) !== norm(currentVersion), latestVersion: latest, canCheck: true };
  }

  if (toolName === "nvm") {
    const r = spawnSync(
      "curl",
      ["-s", "https://api.github.com/repos/nvm-sh/nvm/releases/latest"],
      { encoding: "utf8", timeout: 8000 }
    );
    if (r.error || !r.stdout) return { hasUpdate: false, latestVersion: null, canCheck: false };
    const match = r.stdout.match(/"tag_name"\s*:\s*"v?([^"]+)"/);
    const latest = match?.[1] ?? null;
    if (!latest) return { hasUpdate: false, latestVersion: null, canCheck: false };
    return { hasUpdate: norm(latest) !== norm(currentVersion), latestVersion: latest, canCheck: true };
  }

  if (toolName === "bun") {
    return { hasUpdate: true, latestVersion: null, canCheck: false };
  }

  if (toolName === "pip3") {
    return { hasUpdate: true, latestVersion: null, canCheck: false };
  }

  if (toolName === "cargo") {
    const r = spawnSync(shell, ["-l", "-c", "rustup check"], { encoding: "utf8", timeout: 15000 });
    const out = r.stdout?.trim() ?? "";
    return { hasUpdate: out.includes("Update available"), latestVersion: null, canCheck: true };
  }

  const brewFormulas: Record<string, string> = {
    python3: "python3", go: "go", ruby: "ruby",
    git: "git", dotnet: "dotnet-sdk", docker: "docker",
  };

  if (toolName in brewFormulas) {
    const formula = brewFormulas[toolName];
    const r = spawnSync("zsh", ["-l", "-c", `brew outdated ${formula} --verbose`], { encoding: "utf8", timeout: 20000 });
    const out = r.stdout?.trim() ?? "";
    const hasUpdate = out.length > 0 && !r.error;
    const match = out.match(/\S+\s+(\S+)\s+<\s+(\S+)/);
    return { hasUpdate, latestVersion: match?.[2] ?? null, canCheck: true };
  }

  return { hasUpdate: false, latestVersion: null, canCheck: false };
}

export function updateTool(toolName: string): NvmActionResult {
  const command = getUpdateCommand(toolName);
  if (!command) return { success: false, output: "No update method available for this tool on your platform." };

  const shell = process.platform === "darwin" ? "zsh" : "bash";

  const needsNvm = ["npm", "yarn", "pnpm", "pip3"].includes(toolName);
  const nvmPrefix = needsNvm
    ? (() => { const s = findNvmScript(); return s ? `${nvmSourceCmd(s)} && ` : ""; })()
    : "";

  const result = spawnSync(
    shell,
    ["-l", "-c", `${nvmPrefix}${command}`],
    { encoding: "utf8", timeout: 120000 }
  );

  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  if (result.error) return { success: false, output: result.error.message };
  return { success: result.status === 0, output };
}

function nvmShell(): { shell: string; nvmScript: string } | null {
  const nvmScript = findNvmScript();
  if (!nvmScript) return null;
  const shell = process.platform === "darwin" ? "zsh" : "bash";
  return { shell, nvmScript };
}

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
      current: !!currentMatch,
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

export function listNvmVersions(): NvmVersionList {
  const nvm = nvmShell();
  if (!nvm) return { nvmAvailable: false, versions: [] };

  const result = spawnSync(
    nvm.shell,
    ["-l", "-c", `${nvmSourceCmd(nvm.nvmScript)} && nvm ls --no-colors`],
    { encoding: "utf8", timeout: 8000 }
  );

  if (result.error) return { nvmAvailable: true, versions: [] };

  return {
    nvmAvailable: true,
    versions: parseNvmLs(result.stdout ?? ""),
  };
}

export interface NvmActionResult {
  success: boolean;
  output: string;
}

export function nvmSetDefault(version: string): NvmActionResult {
  const nvm = nvmShell();
  if (!nvm) return { success: false, output: "nvm not found" };

  const result = spawnSync(
    nvm.shell,
    ["-l", "-c", `${nvmSourceCmd(nvm.nvmScript)} && nvm alias default ${version} --no-colors`],
    { encoding: "utf8", timeout: 8000 }
  );

  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  return { success: result.status === 0, output };
}

export function installNvm(): NvmInstallResult {
  if (process.platform === "win32") {
    return {
      success: false,
      output:
        "Windows detected. Please install nvm-windows manually from https://github.com/coreybutler/nvm-windows",
      platform: "windows",
    };
  }

  const platform = process.platform === "darwin" ? "macos" : "linux";
  const shell = process.platform === "darwin" ? "zsh" : "bash";
  const installUrl =
    "https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh";

  const result = spawnSync(
    shell,
    ["-l", "-c", `curl -o- "${installUrl}" | bash`],
    { encoding: "utf8", timeout: 90000 }
  );

  const output = [result.stdout, result.stderr]
    .filter(Boolean)
    .join("\n")
    .trim();

  if (result.error) {
    return { success: false, output: result.error.message, platform };
  }

  return { success: result.status === 0, output, platform };
}

export function probeSingleTool(name: string): DetectedTool | null {
  switch (name) {
    case "node":    return tool("node",    "Node.js",        "nodejs", probeViaNvm("node"));
    case "nvm":     return tool("nvm",     "nvm",            "nodejs", probeNvm());
    case "npm":     return tool("npm",     "npm",            "nodejs", probeViaNvm("npm"));
    case "yarn":    return tool("yarn",    "Yarn",           "nodejs", probeViaNvm("yarn"));
    case "pnpm":    return tool("pnpm",    "pnpm",           "nodejs", probeViaNvm("pnpm"));
    case "bun":     return tool("bun",     "Bun",            "nodejs", probeViaNvm("bun"));
    case "python3": return tool("python3", "Python 3",       "python", probe("python3"));
    case "pip3":    return tool("pip3",    "pip",            "python", probe("pip3"));
    case "dotnet":  return tool("dotnet",  ".NET SDK",       "dotnet", probe("dotnet"));
    case "go":      return tool("go",      "Go",             "system", probe("go", ["version"]));
    case "cargo":   return tool("cargo",   "Rust / Cargo",   "system", probe("cargo"));
    case "ruby":    return tool("ruby",    "Ruby",           "system", probe("ruby"));
    case "git":     return tool("git",     "Git",            "system", probe("git"));
    case "docker":  return tool("docker",  "Docker",         "system", probe("docker"));
    default:        return null;
  }
}

export function scanTools(): ToolScanReport {
  return {
    tools: [
      tool("node", "Node.js", "nodejs", probeViaNvm("node")),
      tool("nvm", "nvm", "nodejs", probeNvm()),
      tool("npm", "npm", "nodejs", probeViaNvm("npm")),
      tool("yarn", "Yarn", "nodejs", probeViaNvm("yarn")),
      tool("pnpm", "pnpm", "nodejs", probeViaNvm("pnpm")),
      tool("bun", "Bun", "nodejs", probeViaNvm("bun")),
      tool("python3", "Python 3", "python", probe("python3")),
      tool("pip3", "pip", "python", probe("pip3")),
      tool("dotnet", ".NET SDK", "dotnet", probe("dotnet")),
      tool("go", "Go", "system", probe("go", ["version"])),
      tool("cargo", "Rust / Cargo", "system", probe("cargo")),
      tool("ruby", "Ruby", "system", probe("ruby")),
      tool("git", "Git", "system", probe("git")),
      tool("docker", "Docker", "system", probe("docker")),
    ]
  };
}
