import { getAgentDefinition, listAgents as listRegisteredAgents, resumeArgs } from "@/shared/lib/agents/agent-registry";
import type { AgentDescriptor } from "@/shared/lib/agents/agent-registry";
import { AttentionDetector } from "@/shared/lib/agents/attention-detector";
import type { AutopilotHold } from "@/shared/lib/agents/autopilot-policy";

import { listPtySessions, onPtyData, onScriptStatus, ptyBacklog, ptySessionTags, startPty } from "./terminal";

export type { AgentDescriptor } from "@/shared/lib/agents/agent-registry";
export { addCustomAgent, removeCustomAgent } from "@/shared/lib/agents/custom-agents-store";
export type { CustomAgent, CustomAgentInput } from "@/shared/lib/agents/custom-agents-store";

export interface AgentRunEvent {
	runId: string;
	projectPath: string;
	projectName: string;
	agentLabel: string;
}

export interface AgentAttentionEvent extends AgentRunEvent {
	waiting: boolean;
	hold: AutopilotHold | null;
}

const AGENT_TAG = "agent";

const runs = new Map<string, AgentRunEvent & { hidden: boolean }>();
const attentionListeners = new Set<(event: AgentAttentionEvent) => void>();
const doneListeners = new Set<(event: AgentRunEvent) => void>();

const describe = (runId: string): AgentRunEvent | null => {
	const run = runs.get(runId);
	if (!run) return null;

	return { runId, projectPath: run.projectPath, projectName: run.projectName, agentLabel: run.agentLabel };
};

const emitAttention = (runId: string, waiting: boolean) => {
	const run = describe(runId);
	if (!run) return;

	for (const listener of attentionListeners) listener({ ...run, waiting, hold: null });
};

const detector = new AttentionDetector((runId) => {
	const run = describe(runId);
	if (!run) return;

	for (const listener of doneListeners) listener(run);
});

const remember = (runId: string, projectPath: string, agentLabel: string, hidden: boolean) =>
	runs.set(runId, {
		runId,
		projectPath,
		projectName: projectPath.slice(projectPath.lastIndexOf("/") + 1),
		agentLabel,
		hidden,
	});

let watching: Promise<void> | null = null;

function watchAgents(): Promise<void> {
	watching ??= (async () => {
		onPtyData(({ runId, data }) => {
			const waiting = detector.push(runId, data);
			if (waiting !== null) emitAttention(runId, waiting);
		});

		onScriptStatus(({ runId, status }) => {
			if (status === "running") return;
			detector.forget(runId);
			runs.delete(runId);
		});

		const tags = await ptySessionTags();
		for (const session of await listPtySessions()) {
			const tag = tags.get(session.runId);
			if (tag?.kind !== AGENT_TAG) continue;

			remember(session.runId, session.projectPath, session.scriptName, tag.hidden === "true");
			const { data } = await ptyBacklog(session.runId);
			if (detector.restore(session.runId, data)) emitAttention(session.runId, true);
		}
	})();

	return watching;
}

export async function listAgents(): Promise<AgentDescriptor[]> {
	return listRegisteredAgents();
}

export async function openAgentTerminal(
	agentId: string,
	projectPath: string,
	cols = 120,
	rows = 30,
	resumeSessionId?: string,
	hidden = false,
): Promise<{ runId: string }> {
	await watchAgents();

	const definition = await getAgentDefinition(agentId);
	if (!definition) {
		throw new Error(`Unknown agent: ${agentId}`);
	}

	const resume = resumeSessionId ? resumeArgs(agentId, resumeSessionId) : null;

	const runId = await startPty({
		command: definition.binary,
		args: [...definition.args, ...(resume ?? [])],
		cwd: projectPath,
		scriptName: definition.label,
		cols,
		rows,
		tags: { kind: AGENT_TAG, agentId, hidden: String(hidden) },
	});

	remember(runId, projectPath, definition.label, hidden);
	detector.track(runId);

	return { runId };
}

export async function isAgentRun(runId: string): Promise<boolean> {
	await watchAgents();
	return detector.isTracked(runId);
}

export async function isHiddenRun(runId: string): Promise<boolean> {
	await watchAgents();
	return runs.get(runId)?.hidden ?? false;
}

export async function isWaiting(runId: string): Promise<boolean> {
	await watchAgents();
	return detector.isWaiting(runId);
}

export function clearAttentionOnSubmit(runId: string, data: string): void {
	if (/[\r\n]/.test(data) && detector.clear(runId)) {
		emitAttention(runId, false);
	}
}

function subscribe<T>(listeners: Set<(value: T) => void>, callback: (value: T) => void) {
	void watchAgents();
	listeners.add(callback);

	return () => {
		listeners.delete(callback);
	};
}

export const onAgentAttention = (callback: (event: AgentAttentionEvent) => void) =>
	subscribe(attentionListeners, callback);

export const onAgentDone = (callback: (event: AgentRunEvent) => void) => subscribe(doneListeners, callback);
