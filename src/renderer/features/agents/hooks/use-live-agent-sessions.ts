import { useCallback, useEffect, useState } from "react";

import { onRunReplaced } from "@renderer/shared/terminal";

export interface LiveAgentSession {
	runId: string;
	agentId: string | null;
	label: string;
	projectPath: string;
	projectName: string;
	waiting: boolean;
}

export function useLiveAgentSessions() {
	const [sessions, setSessions] = useState<LiveAgentSession[]>([]);

	const refresh = useCallback(async () => {
		const [running, agents] = await Promise.all([
			globalThis.lazify.listSessions(),
			globalThis.lazify.listAgents(),
		]);

		setSessions(
			running
				.filter((session) => session.isAgent)
				.map((session) => ({
					runId: session.runId,
					agentId: agents.find((agent) => agent.label === session.scriptName)?.id ?? null,
					label: session.scriptName,
					projectPath: session.projectPath,
					projectName: session.projectName,
					waiting: session.waiting,
				})),
		);
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const drop = useCallback(
		(runId: string) => setSessions((current) => current.filter((session) => session.runId !== runId)),
		[],
	);

	useEffect(
		() =>
			globalThis.lazify.onScriptStatus((event) => {
				if (event.status === "running") void refresh();
				else drop(event.runId);
			}),
		[drop, refresh],
	);

	useEffect(() => globalThis.lazify.onSessionKilled((event) => drop(event.runId)), [drop]);

	useEffect(() => onRunReplaced(() => void refresh()), [refresh]);

	useEffect(
		() =>
			globalThis.lazify.onAgentAttention((event) =>
				setSessions((current) =>
					current.map((session) =>
						session.runId === event.runId ? { ...session, waiting: event.waiting } : session,
					),
				),
			),
		[],
	);

	return { sessions, refresh };
}
