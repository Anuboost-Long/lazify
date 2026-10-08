import { currentOs, environmentVariable, execFile, pathExistsOnDisk } from "@/platform/exec";

import { getCustomAgent, listCustomAgents } from "./custom-agents-store";

/**
 * The catalog of supported agent CLIs.
 *
 * Agents run as ordinary interactive programs inside a PTY, so an entry is just
 * the binary to launch — adding one is a single line here. User-defined agents
 * come from the custom-agents store and run their command through a shell.
 */

export interface AgentDefinition {
  id: string;
  label: string;
  binary: string;
  args: string[];
}

/** What the renderer needs to draw the agent picker. */
export interface AgentDescriptor {
  id: string;
  label: string;
  available: boolean;
  /** True for user-defined agents, which the renderer can also delete. */
  custom?: boolean;
  /** Optional icon (data URL) for a custom agent. */
  image?: string;
}

const AGENTS: AgentDefinition[] = [
  { id: "claude", label: "Claude", binary: "claude", args: [] },
  { id: "codex", label: "Codex", binary: "codex", args: [] },
  { id: "gemini", label: "Gemini", binary: "gemini", args: [] },
  { id: "copilot", label: "Copilot", binary: "copilot", args: [] },
  { id: "cursor", label: "Cursor", binary: "cursor-agent", args: [] },
];

/** Runs an arbitrary command string through the platform shell inside the PTY. */
async function shellCommandDefinition(id: string, label: string, command: string): Promise<AgentDefinition> {
  if ((await currentOs()) === "windows") {
    return { id, label, binary: (await environmentVariable("COMSPEC")) ?? "cmd.exe", args: ["/c", command] };
  }
  // Login shell so PATH matches the user's terminal (nvm, homebrew, etc.).
  return { id, label, binary: (await environmentVariable("SHELL")) ?? "/bin/bash", args: ["-lc", command] };
}

export async function getAgentDefinition(agentId: string): Promise<AgentDefinition | null> {
  const builtIn = AGENTS.find((agent) => agent.id === agentId);
  if (builtIn) {
    // Spawned directly (no shell), so a bare name only resolves when it is on
    // this process's own PATH — resolve it to wherever it actually lives.
    const resolved = await locateBinary(builtIn.binary);
    return resolved ? { ...builtIn, binary: resolved } : builtIn;
  }

  const custom = await getCustomAgent(agentId);
  if (custom) return shellCommandDefinition(custom.id, custom.label, custom.command);

  return null;
}

/**
 * How each built-in agent is told to pick a past session back up. Custom agents
 * run an arbitrary command and have no session to resume, so they answer null.
 */
export function resumeArgs(agentId: string, sessionId: string): string[] | null {
  if (agentId === "claude") return ["--resume", sessionId];
  if (agentId === "codex") return ["resume", sessionId];

  return null;
}

/**
 * Every nvm-managed Node version keeps its own global npm bin dir, so a CLI
 * installed while on one version disappears from PATH the moment `nvm use`
 * switches away from it — even though it is still sitting on disk. Scanning
 * every version's bin dir (not just the currently active one) is what makes
 * detection survive a version switch.
 */
async function findNvmScript(): Promise<string | null> {
  const nvmDir = await environmentVariable("NVM_DIR");
  const home = await environmentVariable("HOME");
  const candidates = [
    nvmDir ? `${nvmDir}/nvm.sh` : null,
    home ? `${home}/.nvm/nvm.sh` : null,
    "/opt/homebrew/opt/nvm/nvm.sh",
    "/usr/local/opt/nvm/nvm.sh",
  ].filter((candidate): candidate is string => candidate !== null);

  for (const candidate of candidates) {
    if (await pathExistsOnDisk(candidate)) return candidate;
  }

  return null;
}

async function nvmVersionBinDirs(): Promise<string[]> {
  const nvmScript = await findNvmScript();
  if (!nvmScript) return [];

  const versionsDir = `${nvmScript.replace(/\/nvm\.sh$/, "")}/versions/node`;
  try {
    const { stdout } = await execFile("ls", ["-1", versionsDir]);
    const dirs = stdout
      .split("\n")
      .filter(Boolean)
      .map((version) => `${versionsDir}/${version}/bin`);
    const present = await Promise.all(dirs.map(pathExistsOnDisk));

    return dirs.filter((_dir, index) => present[index]);
  } catch {
    return [];
  }
}

const locatedBinaryCache = new Map<string, string | null>();

/** Finds where a binary actually lives, on this PATH or under any nvm version. */
async function locateBinary(binary: string): Promise<string | null> {
  const cached = locatedBinaryCache.get(binary);
  if (cached !== undefined) return cached;

  const probe = (await currentOs()) === "windows" ? "where" : "which";
  let resolved: string | null = null;
  try {
    const { stdout } = await execFile(probe, [binary]);
    const found = stdout.split("\n")[0].trim();
    if (found) resolved = found;
  } catch {
    resolved = null;
  }

  if (!resolved) {
    for (const dir of await nvmVersionBinDirs()) {
      if (await pathExistsOnDisk(`${dir}/${binary}`)) {
        resolved = `${dir}/${binary}`;
        break;
      }
    }
  }

  locatedBinaryCache.set(binary, resolved);
  return resolved;
}

async function isBinaryInstalled(binary: string): Promise<boolean> {
  return (await locateBinary(binary)) !== null;
}

export async function listAgents(): Promise<AgentDescriptor[]> {
  const builtIns = await Promise.all(
    AGENTS.map(async ({ id, label, binary }) => ({
      id,
      label,
      available: await isBinaryInstalled(binary),
    })),
  );

  const customs = (await listCustomAgents()).map(({ id, label, image }) => ({
    id,
    label,
    available: true,
    custom: true,
    ...(image ? { image } : {}),
  }));

  return [...builtIns, ...customs];
}
