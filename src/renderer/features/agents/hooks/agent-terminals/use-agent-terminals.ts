import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";

import {
	RUNNABLE_SCRIPTS,
	RUN_SCRIPT_OVERRIDES_KEY,
	activeTabIdAtom,
	availableAgentsAtom,
	loadRunScriptOverrides,
	sessionsToTerminals,
	terminalsAtom,
	waitingProjectByRunIdAtom,
} from "./terminal-store";
import type { AgentTerminal } from "./terminal-store";

export { useFocusAgentRun, useRevealAgentRun } from "./use-agent-run-focus";

/** Sessions are hydrated once per renderer, not once per mounted hook. */
let sessionsHydrated = false;

export function useAgentTerminals(projectPath: string) {
	const [terminals, setTerminals] = useAtom(terminalsAtom);
	const [activeByProject, setActiveByProject] = useAtom(activeTabIdAtom);
	const availableAgents = useAtomValue(availableAgentsAtom);
	const setAvailableAgents = useSetAtom(availableAgentsAtom);
	const [waitingByRunId, setWaitingByRunId] = useAtom(waitingProjectByRunIdAtom);

	const [allScripts, setAllScripts] = useState<Record<string, string>>({});
	const [runScriptOverrides, setRunScriptOverrides] =
		useState<Record<string, string>>(loadRunScriptOverrides);

	const refreshAgents = useCallback(
		() => globalThis.lazify.listAgents().then(setAvailableAgents),
		[setAvailableAgents],
	);

	useEffect(() => {
		void refreshAgents();
	}, [refreshAgents]);

	useEffect(() => {
		if (sessionsHydrated) return;
		sessionsHydrated = true;

		void (async () => {
			const [sessions, agents] = await Promise.all([
				globalThis.lazify.listSessions(),
				globalThis.lazify.listAgents(),
			]);
			if (sessions.length === 0) return;

			const restored = sessionsToTerminals(sessions, agents);

			setTerminals((current) => {
				const known = new Set(current.map((terminal) => terminal.runId));
				const additions = restored.filter((terminal) => !known.has(terminal.runId));
				return additions.length ? [...current, ...additions] : current;
			});

			const waiting = sessions.filter((session) => session.waiting);

			if (waiting.length) {
				setWaitingByRunId((current) => {
					const next = { ...current };
					for (const session of waiting) next[session.runId] = session.projectPath;
					return next;
				});
			}

			setActiveByProject((current) => {
				const next = { ...current };
				for (const terminal of restored) {
					if (next[terminal.projectPath] == null) {
						next[terminal.projectPath] = terminal.tabId;
					}
				}
				return next;
			});
		})();
	}, [setTerminals, setActiveByProject, setWaitingByRunId]);

	const syncSessions = useCallback(async () => {
		const [sessions, agents] = await Promise.all([
			globalThis.lazify.listSessions(),
			globalThis.lazify.listAgents(),
		]);
		if (sessions.length === 0) return;

		const adopted = sessionsToTerminals(sessions, agents);

		setTerminals((current) => {
			const known = new Set(current.map((terminal) => terminal.runId));
			const additions = adopted.filter((terminal) => !known.has(terminal.runId));
			return additions.length ? [...current, ...additions] : current;
		});

		setActiveByProject((current) => {
			const next = { ...current };
			for (const terminal of adopted) {
				if (next[terminal.projectPath] == null) {
					next[terminal.projectPath] = terminal.tabId;
				}
			}
			return next;
		});
	}, [setActiveByProject, setTerminals]);

	const forgetWaiting = useCallback(
		(runId: string) => {
			setWaitingByRunId((current) => {
				if (!(runId in current)) return current;
				const next = { ...current };
				delete next[runId];
				return next;
			});
		},
		[setWaitingByRunId],
	);

	const createAgent = useCallback(
		async (input: { label: string; command: string; image?: string }) => {
			await globalThis.lazify.addCustomAgent(input);
			await refreshAgents();
		},
		[refreshAgents],
	);

	const deleteAgent = useCallback(
		async (agentId: string) => {
			await globalThis.lazify.removeCustomAgent(agentId);
			await refreshAgents();
		},
		[refreshAgents],
	);

	useEffect(() => {
		if (!projectPath) {
			setAllScripts({});
			return;
		}

		void globalThis.lazify.listScripts(projectPath).then(setAllScripts);
	}, [projectPath]);

	const detectedRunnable = RUNNABLE_SCRIPTS.find((name) => name in allScripts) ?? null;
	const chosenScript = runScriptOverrides[projectPath];
	const runnableScript =
		chosenScript && chosenScript in allScripts ? chosenScript : detectedRunnable;

	const setRunnableScript = useCallback(
		(scriptName: string) => {
			if (!projectPath) return;

			setRunScriptOverrides((current) => {
				const next = { ...current, [projectPath]: scriptName };
				localStorage.setItem(RUN_SCRIPT_OVERRIDES_KEY, JSON.stringify(next));
				return next;
			});
		},
		[projectPath],
	);

	const terminalsRef = useRef(terminals);
	terminalsRef.current = terminals;

	useEffect(() => {
		return globalThis.lazify.onScriptStatus((event) => {
			if (event.status !== "done" && event.status !== "error") return;

			setTerminals((current) =>
				current.map((terminal) =>
					terminal.runId === event.runId ? { ...terminal, exited: true } : terminal,
				),
			);

			forgetWaiting(event.runId);
		});
	}, [setTerminals, forgetWaiting]);

	useEffect(() => {
		return globalThis.lazify.onSessionKilled((event) => {
			const target = terminalsRef.current.find((terminal) => terminal.runId === event.runId);
			if (!target) return;

			setActiveByProject((current) => {
				if (current[target.projectPath] !== target.tabId) return current;

				const fallback = terminalsRef.current.find(
					(terminal) => terminal.projectPath === target.projectPath && terminal.tabId !== target.tabId,
				);
				return { ...current, [target.projectPath]: fallback?.tabId ?? null };
			});

			setTerminals((current) => current.filter((terminal) => terminal.tabId !== target.tabId));
			forgetWaiting(event.runId);
		});
	}, [setActiveByProject, setTerminals, forgetWaiting]);

	useEffect(() => {
		return globalThis.lazify.onAgentAttention((event) => {
			setWaitingByRunId((current) => {
				const next = { ...current };
				if (event.waiting) next[event.runId] = event.projectPath;
				else delete next[event.runId];
				return next;
			});
		});
	}, [setWaitingByRunId]);

	const projectTerminals = terminals.filter((terminal) => terminal.projectPath === projectPath);
	const activeTabId = activeByProject[projectPath] ?? null;
	const activeTerminal = projectTerminals.find((terminal) => terminal.tabId === activeTabId) ?? null;

	const setActiveTab = useCallback(
		(tabId: string | null) => {
			setActiveByProject((current) => ({ ...current, [projectPath]: tabId }));
		},
		[projectPath, setActiveByProject],
	);

	const addTerminal = useCallback(
		async (tab: Pick<AgentTerminal, "kind" | "sourceId" | "label">, start: () => Promise<string>) => {
			const tabId = `agent-tab-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

			setTerminals((current) => [
				...current,
				{ ...tab, tabId, projectPath, runId: null, exited: false },
			]);
			setActiveTab(tabId);

			const runId = await start();

			setTerminals((current) =>
				current.map((terminal) => (terminal.tabId === tabId ? { ...terminal, runId } : terminal)),
			);

			return runId;
		},
		[projectPath, setActiveTab, setTerminals],
	);

	const openTerminal = useCallback(
		async (agentId: string, resumeSessionId?: string) => {
			const agent = availableAgents.find((candidate) => candidate.id === agentId);

			return await addTerminal(
				{ kind: "agent", sourceId: agentId, label: agent?.label ?? agentId },
				async () => {
					const { runId } = await globalThis.lazify.openAgentTerminal(
						agentId,
						projectPath,
						undefined,
						undefined,
						resumeSessionId,
					);
					return runId;
				},
			);
		},
		[addTerminal, availableAgents, projectPath],
	);

	const runProject = useCallback(async () => {
		if (!runnableScript) return;

		await addTerminal(
			{ kind: "script", sourceId: runnableScript, label: runnableScript },
			async () => {
				const { runId } = await globalThis.lazify.runScript(projectPath, runnableScript);
				return runId;
			},
		);
	}, [addTerminal, projectPath, runnableScript]);

	const scriptTerminals = projectTerminals.filter((terminal) => terminal.kind === "script");
	const scriptTerminal =
		[...scriptTerminals].reverse().find((terminal) => !terminal.exited) ??
		scriptTerminals[scriptTerminals.length - 1] ??
		null;

	const restartProject = useCallback(async () => {
		if (!scriptTerminal?.runId || scriptTerminal.exited) return;

		const { tabId, runId, sourceId } = scriptTerminal;

		const next = await globalThis.lazify.restartScript(runId, projectPath, sourceId);

		setTerminals((current) =>
			current.map((terminal) =>
				terminal.tabId === tabId ? { ...terminal, runId: next.runId, exited: false } : terminal,
			),
		);
	}, [scriptTerminal, projectPath, setTerminals]);

	const stopProject = useCallback(async (): Promise<boolean> => {
		if (!scriptTerminal?.runId || scriptTerminal.exited) return false;

		const { tabId, runId } = scriptTerminal;

		await globalThis.lazify.stopScript(runId);

		setTerminals((current) => current.filter((terminal) => terminal.tabId !== tabId));

		if (activeTabId === tabId) {
			const fallback = projectTerminals.find((terminal) => terminal.tabId !== tabId);
			setActiveTab(fallback?.tabId ?? null);
		}

		return true;
	}, [scriptTerminal, activeTabId, projectTerminals, setActiveTab, setTerminals]);

	const closeTerminal = useCallback(
		async (tabId: string) => {
			const target = terminals.find((terminal) => terminal.tabId === tabId);

			if (target?.runId) {
				await globalThis.lazify.stopScript(target.runId);
			}

			const remaining = terminals.filter((terminal) => terminal.tabId !== tabId);
			setTerminals(remaining);

			if (activeTabId === tabId) {
				const fallback = remaining.find((terminal) => terminal.projectPath === projectPath);
				setActiveTab(fallback?.tabId ?? null);
			}
		},
		[activeTabId, projectPath, setActiveTab, setTerminals, terminals],
	);

	const closeProjectTerminals = useCallback(
		async (targetProjectPath: string) => {
			const targets = terminalsRef.current.filter(
				(terminal) => terminal.projectPath === targetProjectPath,
			);
			if (targets.length === 0) return;

			await Promise.allSettled(
				targets
					.filter((terminal) => terminal.runId)
					.map((terminal) => globalThis.lazify.stopScript(terminal.runId as string)),
			);

			setTerminals((current) =>
				current.filter((terminal) => terminal.projectPath !== targetProjectPath),
			);
			setActiveByProject((current) => ({ ...current, [targetProjectPath]: null }));

			for (const terminal of targets) {
				if (terminal.runId) forgetWaiting(terminal.runId);
			}
		},
		[forgetWaiting, setActiveByProject, setTerminals],
	);

	const reorderTerminal = useCallback(
		(fromTabId: string, toTabId: string) => {
			if (fromTabId === toTabId) return;

			setTerminals((current) => {
				const slots = current.reduce<number[]>((indexes, terminal, index) => {
					if (terminal.projectPath === projectPath) indexes.push(index);
					return indexes;
				}, []);

				const ordered = slots.map((index) => current[index]);
				const from = ordered.findIndex((terminal) => terminal.tabId === fromTabId);
				const to = ordered.findIndex((terminal) => terminal.tabId === toTabId);

				if (from === -1 || to === -1) return current;

				ordered.splice(to, 0, ordered.splice(from, 1)[0]);

				const next = [...current];
				slots.forEach((index, position) => {
					next[index] = ordered[position];
				});

				return next;
			});
		},
		[projectPath, setTerminals],
	);

	const waitingByProject = Object.values(waitingByRunId).reduce<Record<string, number>>(
		(counts, waitingProjectPath) => {
			counts[waitingProjectPath] = (counts[waitingProjectPath] ?? 0) + 1;
			return counts;
		},
		{},
	);

	const waitingTabIds = projectTerminals
		.filter((terminal) => terminal.runId != null && terminal.runId in waitingByRunId)
		.map((terminal) => terminal.tabId);

	const runningCountByProject = terminals.reduce<Record<string, number>>((counts, terminal) => {
		if (terminal.exited) return counts;
		counts[terminal.projectPath] = (counts[terminal.projectPath] ?? 0) + 1;
		return counts;
	}, {});

	const tabCountByProject = terminals.reduce<Record<string, number>>((counts, terminal) => {
		counts[terminal.projectPath] = (counts[terminal.projectPath] ?? 0) + 1;
		return counts;
	}, {});

	const openAgentIds = [
		...new Set(
			terminals.filter((terminal) => terminal.kind === "agent").map((terminal) => terminal.sourceId),
		),
	].sort();

	return {
		availableAgents,
		openAgentIds,
		runningCountByProject,

		tabCountByProject,

		waitingByProject,
		waitingTabIds,

		waitingByRunId,

		syncSessions,
		terminals: projectTerminals,
		allTerminals: terminals,
		activeTerminal,
		activeTabId,
		runnableScript,

		allScripts,

		setRunnableScript,

		scriptTerminal,
		setActiveTab,
		openTerminal,
		runProject,
		restartProject,
		stopProject,
		closeTerminal,

		closeProjectTerminals,
		reorderTerminal,
		createAgent,
		deleteAgent,
	};
}
