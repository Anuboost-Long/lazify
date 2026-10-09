import { desktop } from "@chain/sdk";

import { watchAgentActivity } from "@/shared/lib/agents/agent-activity-watcher";
import type { AgentActivityEvent } from "@/shared/lib/agents/agent-activity-watcher";
import { getAgentDefinition, listAgents as listRegisteredAgents, resumeArgs } from "@/shared/lib/agents/agent-registry";
import type { AgentDescriptor } from "@/shared/lib/agents/agent-registry";
import { AttentionDetector } from "@/shared/lib/agents/attention-detector";
import { Autopilot } from "@/shared/lib/agents/autopilot";
import type { AutopilotHold } from "@/shared/lib/agents/autopilot-policy";

import { autopilotSettings, isAutopilotActive } from "./autopilot";
import { setAgentBusy } from "./keep-awake";
import { listPtySessions, onPtyData, onScriptStatus, ptyBacklog, ptySessionTags, ptyWrite, startPty } from "./terminal";

export type { AgentDescriptor } from "@/shared/lib/agents/agent-registry";
export { setAgentBudget } from "@/shared/lib/agents/agent-limits-store";
export { listAgentSessions } from "@/shared/lib/agents/agent-sessions";
export { getAgentUsage } from "@/shared/lib/agents/agent-usage";
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

export interface AutopilotAnsweredEvent extends AgentRunEvent {
	question: string;
	optionLabel: string;
}

const AGENT_TAG = "agent";

const runs = new Map<string, AgentRunEvent & { hidden: boolean }>();
const attentionListeners = new Set<(event: AgentAttentionEvent) => void>();
const doneListeners = new Set<(event: AgentRunEvent) => void>();
const focusListeners = new Set<(event: { runId: string; projectPath: string }) => void>();
const autopilotListeners = new Set<(event: AutopilotAnsweredEvent) => void>();
const activityListeners = new Set<(event: AgentActivityEvent) => void>();

const DONE_NOTIFICATION = "agent-done:";

async function alertWhenAway(id: string, title: string, body: string) {
	if (await desktop.attention.isFocused()) return;

	await desktop.attention.notify({ id, title, body });
	await desktop.attention.requestAttention();
}

const describe = (runId: string): AgentRunEvent | null => {
	const run = runs.get(runId);
	if (!run) return null;

	return { runId, projectPath: run.projectPath, projectName: run.projectName, agentLabel: run.agentLabel };
};

const emitAttention = (runId: string, waiting: boolean, hold: AutopilotHold | null = null) => {
	const run = describe(runId);
	if (!run) return;

	for (const listener of attentionListeners) listener({ ...run, waiting, hold });

	if (waiting) {
		void alertWhenAway(`agent-waiting:${runId}`, `${run.agentLabel} needs you`, `${run.projectName} is waiting for a response.`);
	}
};

const detector = new AttentionDetector((runId) => {
	const run = describe(runId);
	if (!run) return;

	for (const listener of doneListeners) listener(run);

	void alertWhenAway(
		`${DONE_NOTIFICATION}${runId}`,
		`${run.agentLabel} is done`,
		`${run.projectName} finished the task you gave it.`,
	);
}, setAgentBusy);

const autopilot = new Autopilot({
	isActive: (runId) => {
		const run = runs.get(runId);
		return run !== undefined && detector.isTracked(runId) && isAutopilotActive(run.projectPath);
	},
	getScreen: (runId) => detector.screen(runId),
	isWaiting: (runId) => detector.isWaiting(runId),
	answer: (runId, keys) => {
		detector.clear(runId);
		ptyWrite(runId, keys);
	},
	onAnswered: (runId, { question, optionLabel }) => {
		const run = describe(runId);
		if (!run) return;

		for (const listener of autopilotListeners) listener({ ...run, question, optionLabel });
	},
	onHeld: (runId, detail) => emitAttention(runId, true, detail.hold),
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
		await autopilotSettings();

		desktop.attention.onNotificationClick((id) => {
			if (!id.startsWith(DONE_NOTIFICATION)) return;

			const runId = id.slice(DONE_NOTIFICATION.length);
			const run = runs.get(runId);
			if (!run) return;

			for (const listener of focusListeners) listener({ runId, projectPath: run.projectPath });
		});

		onPtyData(({ runId, data }) => {
			const waiting = detector.push(runId, data);
			if (waiting === null) return;

			if (waiting && autopilot.willConsider(runId)) {
				autopilot.consider(runId);
				return;
			}

			emitAttention(runId, waiting);
		});

		onScriptStatus(({ runId, status }) => {
			if (status === "running") return;
			detector.forget(runId);
			autopilot.forget(runId);
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

export const onAgentFocus = (callback: (event: { runId: string; projectPath: string }) => void) =>
	subscribe(focusListeners, callback);

export const onAutopilotAnswered = (callback: (event: AutopilotAnsweredEvent) => void) =>
	subscribe(autopilotListeners, callback);

let watchingActivity: Promise<() => void> | null = null;

export const onAgentActivity = (callback: (event: AgentActivityEvent) => void) => {
	watchingActivity ??= watchAgentActivity((event) => {
		for (const listener of activityListeners) listener(event);
	});
	activityListeners.add(callback);

	return () => {
		activityListeners.delete(callback);
	};
};
