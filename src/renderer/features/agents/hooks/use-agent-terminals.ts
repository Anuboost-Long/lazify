import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";

import type { AgentDescriptor } from "../../../../main/agents/agent-registry";

/** A tab is either an agent CLI or the project's dev script — both are just PTYs. */
export interface AgentTerminal {
  /** Stable per-tab id; survives the PTY it is currently showing. */
  tabId: string;
  kind: "agent" | "script";
  /** Agent id for agent tabs, script name for script tabs. */
  sourceId: string;
  label: string;
  projectPath: string;
  /** PTY id, or null while it is still starting. */
  runId: string | null;
  exited: boolean;
}

/** First match wins when deciding what "run the project" means. */
const RUNNABLE_SCRIPTS = ["dev", "start", "serve"];

/**
 * Module-level atoms so terminals keep running while the user is on another
 * page — closing a tab is the only thing that kills the process.
 */
const terminalsAtom = atom<AgentTerminal[]>([]);
const activeTabIdAtom = atom<Record<string, string | null>>({});
const availableAgentsAtom = atom<AgentDescriptor[]>([]);

export function useAgentTerminals(projectPath: string) {
  const [terminals, setTerminals] = useAtom(terminalsAtom);
  const [activeByProject, setActiveByProject] = useAtom(activeTabIdAtom);
  const availableAgents = useAtomValue(availableAgentsAtom);
  const setAvailableAgents = useSetAtom(availableAgentsAtom);
  const [runnableScript, setRunnableScript] = useState<string | null>(null);

  const refreshAgents = useCallback(
    () => globalThis.lazify.listAgents().then(setAvailableAgents),
    [setAvailableAgents]
  );

  useEffect(() => {
    void refreshAgents();
  }, [refreshAgents]);

  // Persist a user-defined agent, then refresh so the picker shows it.
  const createAgent = useCallback(
    async (input: { label: string; command: string; image?: string }) => {
      await globalThis.lazify.addCustomAgent(input);
      await refreshAgents();
    },
    [refreshAgents]
  );

  const deleteAgent = useCallback(
    async (agentId: string) => {
      await globalThis.lazify.removeCustomAgent(agentId);
      await refreshAgents();
    },
    [refreshAgents]
  );

  // Work out what the run button should launch for this project.
  useEffect(() => {
    if (!projectPath) {
      setRunnableScript(null);
      return;
    }

    void globalThis.lazify.listScripts(projectPath).then((scripts) => {
      setRunnableScript(RUNNABLE_SCRIPTS.find((name) => name in scripts) ?? null);
    });
  }, [projectPath]);

  // Mark a tab as exited when its process ends, so the UI can show it.
  useEffect(() => {
    return globalThis.lazify.onScriptStatus((event) => {
      if (event.status !== "done" && event.status !== "error") return;

      setTerminals((current) =>
        current.map((terminal) =>
          terminal.runId === event.runId ? { ...terminal, exited: true } : terminal
        )
      );
    });
  }, [setTerminals]);

  const projectTerminals = terminals.filter(
    (terminal) => terminal.projectPath === projectPath
  );
  const activeTabId = activeByProject[projectPath] ?? null;
  const activeTerminal =
    projectTerminals.find((terminal) => terminal.tabId === activeTabId) ?? null;

  const setActiveTab = useCallback(
    (tabId: string | null) => {
      setActiveByProject((current) => ({ ...current, [projectPath]: tabId }));
    },
    [projectPath, setActiveByProject]
  );

  /** Adds the tab immediately, then fills in the PTY id once it exists. */
  const addTerminal = useCallback(
    async (
      tab: Pick<AgentTerminal, "kind" | "sourceId" | "label">,
      start: () => Promise<string>
    ) => {
      const tabId = `agent-tab-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

      setTerminals((current) => [
        ...current,
        { ...tab, tabId, projectPath, runId: null, exited: false },
      ]);
      setActiveTab(tabId);

      const runId = await start();

      setTerminals((current) =>
        current.map((terminal) => (terminal.tabId === tabId ? { ...terminal, runId } : terminal))
      );
    },
    [projectPath, setActiveTab, setTerminals]
  );

  const openTerminal = useCallback(
    async (agentId: string) => {
      const agent = availableAgents.find((candidate) => candidate.id === agentId);

      await addTerminal(
        { kind: "agent", sourceId: agentId, label: agent?.label ?? agentId },
        async () => {
          const { runId } = await globalThis.lazify.openAgentTerminal(agentId, projectPath);
          return runId;
        }
      );
    },
    [addTerminal, availableAgents, projectPath]
  );

  const runProject = useCallback(async () => {
    if (!runnableScript) return;

    await addTerminal(
      { kind: "script", sourceId: runnableScript, label: runnableScript },
      async () => {
        const { runId } = await globalThis.lazify.runScript(projectPath, runnableScript);
        return runId;
      }
    );
  }, [addTerminal, projectPath, runnableScript]);

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
    [activeTabId, projectPath, setActiveTab, setTerminals, terminals]
  );

  /** Drops the dragged tab onto the target's position, shifting the rest. */
  const reorderTerminal = useCallback(
    (fromTabId: string, toTabId: string) => {
      if (fromTabId === toTabId) return;

      setTerminals((current) => {
        // Only this project's tabs move. They are rewritten into the same slots
        // they already occupy in the shared list, so every other project keeps
        // both its order and its position.
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
    [projectPath, setTerminals]
  );

  // Live terminal count per project, for the project picker's status line.
  const runningCountByProject = terminals.reduce<Record<string, number>>((counts, terminal) => {
    if (terminal.exited) return counts;
    counts[terminal.projectPath] = (counts[terminal.projectPath] ?? 0) + 1;
    return counts;
  }, {});

  return {
    availableAgents,
    runningCountByProject,
    terminals: projectTerminals,
    activeTerminal,
    activeTabId,
    runnableScript,
    setActiveTab,
    openTerminal,
    runProject,
    closeTerminal,
    reorderTerminal,
    createAgent,
    deleteAgent,
  };
}
