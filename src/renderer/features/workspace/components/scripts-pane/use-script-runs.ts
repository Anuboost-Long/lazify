import {
  useProjectScripts,
  type ScriptTab as Tab,
} from "@renderer/features/workspace/hooks/use-project-scripts";
import type { ScriptStatusEvent } from "@renderer/shared/types/lazify";
import { useEffect, useRef } from "react";

// Always assign the lowest available terminal number (fills gaps after closes)
function nextTabIndex(tabs: Tab[]): number {
  const used = new Set(tabs.map((t) => t.index));
  let i = 1;
  while (used.has(i)) i++;
  return i;
}

/**
 * The terminal tabs of the scripts pane and the runs behind them.
 *
 * The tab layout itself outlives the pane (see `useProjectScripts`), so what
 * this adds is the live half: starting and stopping runs, following their exit
 * status, and — on every mount — reconciling the remembered tabs against the
 * sessions the main process still has, since anything can have happened to them
 * while the pane was off screen.
 */
export function useScriptRuns(projectPath: string) {
  const { tabs, setTabs, activeTabId, setActiveTabId } =
    useProjectScripts(projectPath);

  const unsubMapRef = useRef<Map<string, () => void>>(new Map());
  const tabsRef = useRef(tabs);
  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  const subscribeStatus = (runId: string, tabId: string) => {
    const stopStatus = globalThis.lazify.onScriptStatus(
      (event: ScriptStatusEvent) => {
        if (event.runId !== runId) return;
        if (event.status === "done" || event.status === "error") {
          setTabs((prev) =>
            prev.map((tab) =>
              tab.tabId === tabId
                ? { ...tab, status: event.status as "done" | "error" }
                : tab
            )
          );
          unsubMapRef.current.get(runId)?.();
          unsubMapRef.current.delete(runId);
        }
      }
    );
    unsubMapRef.current.set(runId, stopStatus);
  };

  // On (re)mount, reconcile persisted tabs with the sessions still alive in the
  // main process: re-attach status listeners to runs that are still going, and
  // mark as finished any that exited while this pane was unmounted.
  useEffect(() => {
    let cancelled = false;
    // Only the tabs that were already here when the pane mounted: a run started
    // while the session list was still in flight is not this pass's to judge.
    const known = new Set(tabsRef.current.map((tab) => tab.tabId));

    void (async () => {
      let sessions;
      try {
        sessions = await globalThis.lazify.listSessions();
      } catch {
        return;
      }
      if (cancelled) return;

      const live = new Set(
        sessions
          .filter((session) => session.projectPath === projectPath)
          .map((session) => session.runId)
      );

      tabsRef.current.forEach((tab) => {
        if (
          tab.runId &&
          tab.status === "running" &&
          live.has(tab.runId) &&
          !unsubMapRef.current.has(tab.runId)
        ) {
          subscribeStatus(tab.runId, tab.tabId);
        }
      });

      // A run that is no longer alive cannot be attached to: the main process
      // drops a session's transcript when it exits, so a tab that kept its
      // runId would mount a terminal with nothing to replay into it — the blank
      // panel this pane used to come back to. The tab keeps its script name and
      // reads as finished, ready to be run again.
      const isStale = (tab: Tab) =>
        known.has(tab.tabId) && tab.runId !== null && !live.has(tab.runId);

      if (tabsRef.current.some(isStale)) {
        setTabs((prev) =>
          prev.map((tab) =>
            isStale(tab) ? { ...tab, runId: null, status: "done" } : tab
          )
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  const handleAddTab = () => {
    const tabId = `tab-${Date.now()}`;
    setTabs((prev) => {
      const index = nextTabIndex(prev);
      return [
        ...prev,
        { tabId, index, runId: null, scriptName: null, status: "idle" },
      ];
    });
    setActiveTabId(tabId);
  };

  const handleRun = async (scriptName: string, restartRunId?: string) => {
    // Capture the target tab at call time — user may switch tabs during the await
    const targetTabId = activeTabId;
    const tab = tabs.find((t) => t.tabId === targetTabId);
    // A restart is the one case where launching over a running tab is intended.
    if (!tab || (!restartRunId && (tab.status === "running" || tab.status === "pending"))) return;

    setTabs((prev) =>
      prev.map((t) =>
        t.tabId === targetTabId
          ? { ...t, runId: "", scriptName, status: "pending" }
          : t
      )
    );

    const container = document.querySelector<HTMLElement>(
      "[data-pty-container]"
    );
    const cols = container ? Math.floor(container.clientWidth / 7.5) : 220;
    const rows = container ? Math.floor(container.clientHeight / 17) : 50;

    try {
      const { runId } = restartRunId
        ? await globalThis.lazify.restartScript(
            restartRunId,
            projectPath,
            scriptName,
            Math.max(cols, 40),
            Math.max(rows, 10)
          )
        : await globalThis.lazify.runScript(
            projectPath,
            scriptName,
            Math.max(cols, 40),
            Math.max(rows, 10)
          );
      setTabs((prev) =>
        prev.map((t) =>
          t.tabId === targetTabId ? { ...t, runId, status: "running" } : t
        )
      );
      subscribeStatus(runId, targetTabId);
    } catch {
      setTabs((prev) =>
        prev.map((t) =>
          t.tabId === targetTabId ? { ...t, status: "error" } : t
        )
      );
    }
  };

  /**
   * The old run's status subscription is dropped first, so its exit event
   * cannot mark the tab failed after the replacement has already started.
   */
  const handleRestart = async (scriptName: string) => {
    const tab = tabs.find((t) => t.tabId === activeTabId);
    if (!tab?.runId) return;

    unsubMapRef.current.get(tab.runId)?.();
    unsubMapRef.current.delete(tab.runId);

    await handleRun(scriptName, tab.runId);
  };

  const handleStop = async () => {
    const tab = tabs.find((t) => t.tabId === activeTabId);
    if (!tab?.runId) return;
    await globalThis.lazify.stopScript(tab.runId);
    unsubMapRef.current.get(tab.runId)?.();
    unsubMapRef.current.delete(tab.runId);
    setTabs((prev) =>
      prev.map((t) => (t.tabId === activeTabId ? { ...t, status: "error" } : t))
    );
  };

  const handleCloseTab = (tabId: string) => {
    const tab = tabs.find((t) => t.tabId === tabId);
    if (tab?.status === "running" && tab.runId) {
      void globalThis.lazify.stopScript(tab.runId);
      unsubMapRef.current.get(tab.runId)?.();
      unsubMapRef.current.delete(tab.runId);
    }

    const remaining = tabs.filter((t) => t.tabId !== tabId);

    if (remaining.length === 0) {
      // Always keep at least one tab — auto-create a fresh one starting from index 1
      const newTabId = `tab-${Date.now()}`;
      setTabs([
        {
          tabId: newTabId,
          index: 1,
          runId: null,
          scriptName: null,
          status: "idle",
        },
      ]);
      setActiveTabId(newTabId);
    } else {
      setTabs(remaining);
      if (activeTabId === tabId) {
        setActiveTabId(remaining[remaining.length - 1].tabId);
      }
    }
  };

  // Cleanup all subscriptions on unmount
  useEffect(() => {
    return () => {
      unsubMapRef.current.forEach((unsub) => unsub());
      unsubMapRef.current.clear();
    };
  }, []);

  return {
    tabs,
    activeTabId,
    setActiveTabId,
    handleAddTab,
    handleRun,
    handleRestart,
    handleStop,
    handleCloseTab,
  };
}
