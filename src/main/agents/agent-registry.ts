import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { getCustomAgent, listCustomAgents } from "./custom-agents-store";
import { findNvmScript } from "../environment/tools/nvm-shell";

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
function shellCommandDefinition(id: string, label: string, command: string): AgentDefinition {
  if (process.platform === "win32") {
    return { id, label, binary: process.env.COMSPEC ?? "cmd.exe", args: ["/c", command] };
  }
  // Login shell so PATH matches the user's terminal (nvm, homebrew, etc.).
  return { id, label, binary: process.env.SHELL ?? "/bin/bash", args: ["-lc", command] };
}

export function getAgentDefinition(agentId: string): AgentDefinition | null {
  const builtIn = AGENTS.find((agent) => agent.id === agentId);
  if (builtIn) {
    // Spawned directly (no shell), so a bare name only resolves when it is on
    // this process's own PATH — resolve it to wherever it actually lives.
    const resolved = locateBinary(builtIn.binary);
    return resolved ? { ...builtIn, binary: resolved } : builtIn;
  }

  const custom = getCustomAgent(agentId);
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
function nvmVersionBinDirs(): string[] {
  const nvmScript = findNvmScript();
  if (!nvmScript) return [];

  const versionsDir = join(nvmScript.replace(/\/nvm\.sh$/, ""), "versions", "node");
  try {
    return readdirSync(versionsDir)
      .map((version) => join(versionsDir, version, "bin"))
      .filter((dir) => existsSync(dir));
  } catch {
    return [];
  }
}

const locatedBinaryCache = new Map<string, string | null>();

/** Finds where a binary actually lives, on this PATH or under any nvm version. */
function locateBinary(binary: string): string | null {
  const cached = locatedBinaryCache.get(binary);
  if (cached !== undefined) return cached;

  const probe = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(probe, [binary], { encoding: "utf8" });
  let resolved: string | null = null;
  if (result.status === 0) {
    const found = result.stdout.split("\n")[0].trim();
    if (found) resolved = found;
  }

  if (!resolved) {
    resolved =
      nvmVersionBinDirs().map((dir) => join(dir, binary)).find((candidate) => existsSync(candidate)) ?? null;
  }

  locatedBinaryCache.set(binary, resolved);
  return resolved;
}

function isBinaryInstalled(binary: string): boolean {
  return locateBinary(binary) !== null;
}

export function listAgents(): AgentDescriptor[] {
  const builtIns = AGENTS.map(({ id, label, binary }) => ({
    id,
    label,
    available: isBinaryInstalled(binary),
  }));

  const customs = listCustomAgents().map(({ id, label, image }) => ({
    id,
    label,
    available: true,
    custom: true,
    ...(image ? { image } : {}),
  }));

  return [...builtIns, ...customs];
}
