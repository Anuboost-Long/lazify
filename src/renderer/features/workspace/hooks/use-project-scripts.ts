import { atom, useAtom } from "jotai";
import { useCallback, type Dispatch, type SetStateAction } from "react";

export type TabStatus = "idle" | "pending" | "running" | "done" | "error";

export interface ScriptTab {
  tabId: string;
  index: number;
  runId: string | null; // null = idle, "" = PTY starting, "pty-xxx" = active
  scriptName: string | null;
  status: TabStatus;
}

interface ProjectScriptsState {
  tabs: ScriptTab[];
  activeTabId: string;
}

function freshState(): ProjectScriptsState {
  const tabId = "tab-init";
  return {
    tabs: [{ tabId, index: 1, runId: null, scriptName: null, status: "idle" }],
    activeTabId: tabId,
  };
}

/**
 * Script terminal tabs kept per project in a module-level atom rather than in
 * component state. Running a script spawns a PTY in the main process that keeps
 * going regardless of the renderer, so parking the tab layout here lets the
 * pane remember its runs — and reconnect to them — after the user navigates
 * away and back. This is in-memory only: it survives page changes but resets on
 * app restart.
 */
const scriptsByProjectAtom = atom<Record<string, ProjectScriptsState>>({});

export function useProjectScripts(projectPath: string) {
  const [byProject, setByProject] = useAtom(scriptsByProjectAtom);
  const state = byProject[projectPath] ?? freshState();

  const setState = useCallback(
    (updater: (prev: ProjectScriptsState) => ProjectScriptsState) => {
      setByProject((prev) => {
        const current = prev[projectPath] ?? freshState();
        return { ...prev, [projectPath]: updater(current) };
      });
    },
    [projectPath, setByProject],
  );

  const setTabs: Dispatch<SetStateAction<ScriptTab[]>> = useCallback(
    (action) => {
      setState((prev) => ({
        ...prev,
        tabs:
          typeof action === "function"
            ? (action as (tabs: ScriptTab[]) => ScriptTab[])(prev.tabs)
            : action,
      }));
    },
    [setState],
  );

  const setActiveTabId: Dispatch<SetStateAction<string>> = useCallback(
    (action) => {
      setState((prev) => ({
        ...prev,
        activeTabId:
          typeof action === "function"
            ? (action as (id: string) => string)(prev.activeTabId)
            : action,
      }));
    },
    [setState],
  );

  return {
    tabs: state.tabs,
    activeTabId: state.activeTabId,
    setTabs,
    setActiveTabId,
  };
}
