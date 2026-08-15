import { atom } from "jotai";

import type { AgentDescriptor } from "../../../../../main/agents/agent-registry";

export interface AgentTerminal {
  tabId: string;
  kind: "agent" | "script";

  sourceId: string;
  label: string;
  projectPath: string;

  runId: string | null;
  exited: boolean;
}

export const RUNNABLE_SCRIPTS = ["dev", "start", "serve", "dotnet:watch", "dotnet:run"];

export const RUN_SCRIPT_OVERRIDES_KEY = "lazify-run-script-overrides";

export function loadRunScriptOverrides(): Record<string, string> {
  try {
    return JSON.parse(
      localStorage.getItem(RUN_SCRIPT_OVERRIDES_KEY) ?? "{}",
    ) as Record<string, string>;
  } catch {
    return {};
  }
}

export const terminalsAtom = atom<AgentTerminal[]>([]);
export const activeTabIdAtom = atom<Record<string, string | null>>({});
export const availableAgentsAtom = atom<AgentDescriptor[]>([]);

export const waitingProjectByRunIdAtom = atom<Record<string, string>>({});

export const revealRunIdAtom = atom<string | null>(null);

export function sessionsToTerminals(
  sessions: { runId: string; scriptName: string; projectPath: string }[],
  agents: AgentDescriptor[],
): AgentTerminal[] {
  return sessions.map((session) => {
    const agent = agents.find((candidate) => candidate.label === session.scriptName);
    return {
      tabId: `agent-tab-restored-${session.runId}`,
      kind: agent ? ("agent" as const) : ("script" as const),
      sourceId: agent ? agent.id : session.scriptName,
      label: session.scriptName,
      projectPath: session.projectPath,
      runId: session.runId,
      exited: false,
    };
  });
}
