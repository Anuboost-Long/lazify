import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";

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

/**
 * First match wins when deciding what "run the project" means. The synthesised
 * `dotnet:*` entries come last so a repo with both a package.json and a
 * `.csproj` still runs its JS dev server.
 */
const RUNNABLE_SCRIPTS = ["dev", "start", "serve", "dotnet:watch", "dotnet:run"];

/** localStorage key holding each project's chosen run-button script. */
const RUN_SCRIPT_OVERRIDES_KEY = "lazify-run-script-overrides";

function loadRunScriptOverrides(): Record<string, string> {
  try {
    return JSON.parse(
      localStorage.getItem(RUN_SCRIPT_OVERRIDES_KEY) ?? "{}",
    ) as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * Module-level atoms so terminals keep running while the user is on another
 * page — closing a tab is the only thing that kills the process.
 */
const terminalsAtom = atom<AgentTerminal[]>([]);
const activeTabIdAtom = atom<Record<string, string | null>>({});
const availableAgentsAtom = atom<AgentDescriptor[]>([]);
/**
 * Per-run alert state: run id -> the project path whose agent is waiting on the
 * user. Keyed by run so a closed or restarted tab cannot strand an alert, and
 * carrying the project path (straight from the attention event) so the card can
 * light up without needing a matching open tab. Global: a prompt in one project
 * still has to reach the rail while another project is selected.
 */
const waitingProjectByRunIdAtom = atom<Record<string, string>>({});

/**
 * A renderer refresh throws away the in-memory tab state above, but main keeps
 * the PTY sessions alive. Guarded at module scope so the tabs are rebuilt from
 * those live sessions exactly once per renderer load, no matter how many hook
 * instances mount.
 */
let sessionsHydrated = false;

export function useAgentTerminals(projectPath: string) {
  const [terminals, setTerminals] = useAtom(terminalsAtom);
  const [activeByProject, setActiveByProject] = useAtom(activeTabIdAtom);
  const availableAgents = useAtomValue(availableAgentsAtom);
  const setAvailableAgents = useSetAtom(availableAgentsAtom);
  const [waitingByRunId, setWaitingByRunId] = useAtom(waitingProjectByRunIdAtom);
  // Every package.json (and synthesised .NET) script the run button can bind to.
  const [allScripts, setAllScripts] = useState<Record<string, string>>({});
  const [runScriptOverrides, setRunScriptOverrides] = useState<
    Record<string, string>
  >(loadRunScriptOverrides);

  const refreshAgents = useCallback(
    () => globalThis.lazify.listAgents().then(setAvailableAgents),
    [setAvailableAgents],
  );

  useEffect(() => {
    void refreshAgents();
  }, [refreshAgents]);

  // Rebuild tabs for sessions that main is still running after a refresh, so
  // the session the user opened is not stranded without a tab to reach it.
  useEffect(() => {
    if (sessionsHydrated) return;
    sessionsHydrated = true;

    void (async () => {
      const [sessions, agents] = await Promise.all([
        globalThis.lazify.listSessions(),
        globalThis.lazify.listAgents(),
      ]);
      if (sessions.length === 0) return;

      // Agent sessions are labelled with the agent's display label; anything
      // else is a run-button script whose name is the source id.
      const restored: AgentTerminal[] = sessions.map((session) => {
        const agent = agents.find((candidate) => candidate.label === session.scriptName);
        return {
          tabId: `agent-tab-restored-${session.runId}`,
          kind: agent ? "agent" : "script",
          sourceId: agent ? agent.id : session.scriptName,
          label: session.scriptName,
          projectPath: session.projectPath,
          runId: session.runId,
          exited: false,
        };
      });

      setTerminals((current) => {
        const known = new Set(current.map((terminal) => terminal.runId));
        const additions = restored.filter((terminal) => !known.has(terminal.runId));
        return additions.length ? [...current, ...additions] : current;
      });

      // Main kept detecting prompts across the refresh, but the renderer only
      // hears about waiting on a transition — one it missed. Re-seed from the
      // sessions still waiting so their badge and tab marker come back.
      const waiting = sessions.filter((session) => session.waiting);

      if (waiting.length) {
        setWaitingByRunId((current) => {
          const next = { ...current };
          for (const session of waiting) next[session.runId] = session.projectPath;
          return next;
        });
      }

      // Give each restored project a visible tab without stealing focus from a
      // project the user has already picked one for.
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

  // Clears a run's alert — used when it exits, is killed, or is answered.
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

  // Persist a user-defined agent, then refresh so the picker shows it.
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

  // Load every runnable script so the run button — and its picker — can offer them.
  useEffect(() => {
    if (!projectPath) {
      setAllScripts({});
      return;
    }

    void globalThis.lazify.listScripts(projectPath).then(setAllScripts);
  }, [projectPath]);

  // What the run button launches: the user's explicit pick when it still exists,
  // otherwise the first auto-detected dev script.
  const detectedRunnable =
    RUNNABLE_SCRIPTS.find((name) => name in allScripts) ?? null;
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

  // Latest terminals for event listeners that must not re-subscribe on change.
  const terminalsRef = useRef(terminals);
  terminalsRef.current = terminals;

  // Mark a tab as exited when its process ends, so the UI can show it.
  useEffect(() => {
    return globalThis.lazify.onScriptStatus((event) => {
      if (event.status !== "done" && event.status !== "error") return;

      setTerminals((current) =>
        current.map((terminal) =>
          terminal.runId === event.runId
            ? { ...terminal, exited: true }
            : terminal,
        ),
      );

      // An agent that has exited is not waiting for an answer.
      forgetWaiting(event.runId);
    });
  }, [setTerminals, forgetWaiting]);

  // A session killed from outside this pane (the sessions pane, most often)
  // drops its tab entirely, moving any project that was showing it off it.
  useEffect(() => {
    return globalThis.lazify.onSessionKilled((event) => {
      const target = terminalsRef.current.find(
        (terminal) => terminal.runId === event.runId,
      );
      if (!target) return;

      setActiveByProject((current) => {
        if (current[target.projectPath] !== target.tabId) return current;

        const fallback = terminalsRef.current.find(
          (terminal) =>
            terminal.projectPath === target.projectPath &&
            terminal.tabId !== target.tabId,
        );
        return { ...current, [target.projectPath]: fallback?.tabId ?? null };
      });

      setTerminals((current) =>
        current.filter((terminal) => terminal.tabId !== target.tabId),
      );
      forgetWaiting(event.runId);
    });
  }, [setActiveByProject, setTerminals, forgetWaiting]);

  // Main watches agent output for permission/clarification prompts and reports
  // the transitions. The alert for a project is simply: does any of its runs
  // currently want an answer — set true here, cleared when it no longer does.
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

  const projectTerminals = terminals.filter(
    (terminal) => terminal.projectPath === projectPath,
  );
  const activeTabId = activeByProject[projectPath] ?? null;
  const activeTerminal =
    projectTerminals.find((terminal) => terminal.tabId === activeTabId) ?? null;

  const setActiveTab = useCallback(
    (tabId: string | null) => {
      setActiveByProject((current) => ({ ...current, [projectPath]: tabId }));
    },
    [projectPath, setActiveByProject],
  );

  /** Adds the tab immediately, then fills in the PTY id once it exists. */
  const addTerminal = useCallback(
    async (
      tab: Pick<AgentTerminal, "kind" | "sourceId" | "label">,
      start: () => Promise<string>,
    ) => {
      const tabId = `agent-tab-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

      setTerminals((current) => [
        ...current,
        { ...tab, tabId, projectPath, runId: null, exited: false },
      ]);
      setActiveTab(tabId);

      const runId = await start();

      setTerminals((current) =>
        current.map((terminal) =>
          terminal.tabId === tabId ? { ...terminal, runId } : terminal,
        ),
      );
    },
    [projectPath, setActiveTab, setTerminals],
  );

  const openTerminal = useCallback(
    async (agentId: string) => {
      const agent = availableAgents.find(
        (candidate) => candidate.id === agentId,
      );

      await addTerminal(
        { kind: "agent", sourceId: agentId, label: agent?.label ?? agentId },
        async () => {
          const { runId } = await globalThis.lazify.openAgentTerminal(
            agentId,
            projectPath,
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
        const { runId } = await globalThis.lazify.runScript(
          projectPath,
          runnableScript,
        );
        return runId;
      },
    );
  }, [addTerminal, projectPath, runnableScript]);

  /**
   * The run the debug controls act on: this project's most recent script tab,
   * preferring a live one. Deliberately not tied to the active tab — the panel
   * controls the project's run even while you are reading an agent's output.
   */
  const scriptTerminals = projectTerminals.filter((terminal) => terminal.kind === "script");
  const scriptTerminal =
    [...scriptTerminals].reverse().find((terminal) => !terminal.exited) ??
    scriptTerminals[scriptTerminals.length - 1] ??
    null;

  /**
   * Restarts in place: main kills the old process and waits for it to exit
   * before relaunching, so the tab keeps its identity and scrollback while the
   * run id underneath it changes.
   */
  const restartProject = useCallback(async () => {
    if (!scriptTerminal?.runId || scriptTerminal.exited) return;

    const { tabId, runId, sourceId } = scriptTerminal;

    const next = await globalThis.lazify.restartScript(runId, projectPath, sourceId);

    setTerminals((current) =>
      current.map((terminal) =>
        terminal.tabId === tabId
          ? { ...terminal, runId: next.runId, exited: false }
          : terminal,
      ),
    );
  }, [scriptTerminal, projectPath, setTerminals]);

  /**
   * Stops the run and tears it down completely: the process is terminated, its
   * tab goes with it, and the caller closes the debug rail. Always returns true
   * so the panel is dismissed alongside the tab.
   */
  const stopProject = useCallback(async (): Promise<boolean> => {
    if (!scriptTerminal?.runId || scriptTerminal.exited) return false;

    const { tabId, runId } = scriptTerminal;

    await globalThis.lazify.stopScript(runId);

    setTerminals((current) => current.filter((terminal) => terminal.tabId !== tabId));

    if (activeTabId === tabId) {
      const fallback = projectTerminals.find(
        (terminal) => terminal.tabId !== tabId,
      );
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

      const remaining = terminals.filter(
        (terminal) => terminal.tabId !== tabId,
      );
      setTerminals(remaining);

      if (activeTabId === tabId) {
        const fallback = remaining.find(
          (terminal) => terminal.projectPath === projectPath,
        );
        setActiveTab(fallback?.tabId ?? null);
      }
    },
    [activeTabId, projectPath, setActiveTab, setTerminals, terminals],
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
        const from = ordered.findIndex(
          (terminal) => terminal.tabId === fromTabId,
        );
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

  /**
   * Projects with an agent waiting on a reply, for the project rail's badge.
   * Read straight from the alert state's project paths, so the card lights up
   * on detection alone — no open tab has to be matched for the bell to show.
   */
  const waitingByProject = Object.values(waitingByRunId).reduce<Record<string, number>>(
    (counts, waitingProjectPath) => {
      counts[waitingProjectPath] = (counts[waitingProjectPath] ?? 0) + 1;
      return counts;
    },
    {},
  );

  /** Tab ids waiting on the user, so the tab itself can be marked. */
  const waitingTabIds = projectTerminals
    .filter((terminal) => terminal.runId != null && terminal.runId in waitingByRunId)
    .map((terminal) => terminal.tabId);

  // Live terminal count per project, for the project picker's status line.
  const runningCountByProject = terminals.reduce<Record<string, number>>(
    (counts, terminal) => {
      if (terminal.exited) return counts;
      counts[terminal.projectPath] = (counts[terminal.projectPath] ?? 0) + 1;
      return counts;
    },
    {},
  );

  // Which agents are worth reading usage for. Tabs from every project count:
  // an agent's quota is per account, not per project. Sorted so the list is a
  // stable identity for callers that key off it.
  const openAgentIds = [
    ...new Set(
      terminals
        .filter((terminal) => terminal.kind === "agent")
        .map((terminal) => terminal.sourceId),
    ),
  ].sort();

  return {
    availableAgents,
    openAgentIds,
    runningCountByProject,
    /** Project path -> number of its agents waiting on the user. */
    waitingByProject,
    waitingTabIds,
    terminals: projectTerminals,
    activeTerminal,
    activeTabId,
    runnableScript,
    /** Every script the run button can be bound to, name -> command. */
    allScripts,
    /** Rebinds the run button to a chosen script for this project. */
    setRunnableScript,
    /** This project's run, live or exited; null until one is started. */
    scriptTerminal,
    setActiveTab,
    openTerminal,
    runProject,
    restartProject,
    stopProject,
    closeTerminal,
    reorderTerminal,
    createAgent,
    deleteAgent,
  };
}
