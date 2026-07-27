import { spawnSync } from "node:child_process";

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
function shellCommandDefinition(id: string, label: string, command: string): AgentDefinition {
  if (process.platform === "win32") {
    return { id, label, binary: process.env.COMSPEC ?? "cmd.exe", args: ["/c", command] };
  }
  // Login shell so PATH matches the user's terminal (nvm, homebrew, etc.).
  return { id, label, binary: process.env.SHELL ?? "/bin/bash", args: ["-lc", command] };
}

export function getAgentDefinition(agentId: string): AgentDefinition | null {
  const builtIn = AGENTS.find((agent) => agent.id === agentId);
  if (builtIn) return builtIn;

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

function isBinaryInstalled(binary: string): boolean {
  const probe = process.platform === "win32" ? "where" : "which";
  return spawnSync(probe, [binary], { encoding: "utf8" }).status === 0;
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
