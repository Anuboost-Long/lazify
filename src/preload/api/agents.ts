import { ipcRenderer } from "electron";

import type { AgentActivityEvent } from "../../main/agents/agent-activity-watcher";
import type { AgentDescriptor } from "../../main/agents/agent-registry";
import type { AgentSessionSummary } from "../../main/agents/agent-sessions";
import type { AutopilotHold } from "../../main/agents/autopilot-policy";
import type { AutopilotSettings } from "../../main/agents/autopilot-store";
import type { CustomAgent, CustomAgentInput } from "../../main/agents/custom-agents-store";
import type { AgentUsageReport } from "../../renderer/shared/types/lazify";
import { subscribe } from "./subscribe";
export const agentsApi = {
	onAgentAttention: (
		callback: (event: {
			runId: string;
			projectPath: string;
			projectName: string;
			agentLabel: string;
			waiting: boolean;
			/** Why autopilot left this prompt to the user, when it looked at it. */
			hold: AutopilotHold | null;
		}) => void,
	) => subscribe("lazify:agent-attention", callback),
	onAutopilotAnswered: (
		callback: (event: {
			runId: string;
			projectPath: string;
			projectName: string;
			agentLabel: string;
			question: string;
			optionLabel: string;
		}) => void,
	) => subscribe("lazify:autopilot-answered", callback),
	onAgentDone: (
		callback: (event: {
			runId: string;
			projectPath: string;
			projectName: string;
			agentLabel: string;
		}) => void,
	) => subscribe("lazify:agent-done", callback),
	onAgentFocus: (callback: (event: { runId: string; projectPath: string }) => void) =>
		subscribe("lazify:agent-focus", callback),
	listAgents: (): Promise<AgentDescriptor[]> => ipcRenderer.invoke("lazify:list-agents"),
	listAgentSessions: (projectPath: string): Promise<AgentSessionSummary[]> =>
		ipcRenderer.invoke("lazify:list-agent-sessions", projectPath),
	addCustomAgent: (input: CustomAgentInput): Promise<CustomAgent> =>
		ipcRenderer.invoke("lazify:add-custom-agent", input),
	removeCustomAgent: (agentId: string): Promise<void> =>
		ipcRenderer.invoke("lazify:remove-custom-agent", agentId),
	autopilotSettings: (): Promise<AutopilotSettings> =>
		ipcRenderer.invoke("lazify:autopilot-settings"),
	setAutopilot: (enabled: boolean): Promise<AutopilotSettings> =>
		ipcRenderer.invoke("lazify:set-autopilot", enabled),
	setAutopilotProject: (projectPath: string, enabled: boolean): Promise<AutopilotSettings> =>
		ipcRenderer.invoke("lazify:set-autopilot-project", projectPath, enabled),
	getAgentUsage: (sinceIso?: string, agentIds?: string[]): Promise<AgentUsageReport> =>
		ipcRenderer.invoke("lazify:agent-usage", sinceIso, agentIds),
	setAgentBudget: (agentId: string, weeklyTokens: number): Promise<Record<string, number>> =>
		ipcRenderer.invoke("lazify:set-agent-budget", agentId, weeklyTokens),
	openAgentTerminal: (
		agentId: string,
		projectPath: string,
		cols?: number,
		rows?: number,
		/** Past session to carry on with, instead of starting a new conversation. */
		resumeSessionId?: string,
		/** Kept out of every session list: one screen owns it and shows it. */
		hidden?: boolean,
	): Promise<{ runId: string }> =>
		ipcRenderer.invoke(
			"lazify:open-agent-terminal",
			agentId,
			projectPath,
			cols,
			rows,
			resumeSessionId,
			hidden,
		),
	onAgentActivity: (callback: (event: AgentActivityEvent) => void) =>
		subscribe("lazify:agent-activity", callback),
};
