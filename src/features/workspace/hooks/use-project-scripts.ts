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

const STORAGE_KEY = "lazify-script-tabs";

function loadPersisted(): Record<string, ProjectScriptsState> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<
      string,
      ProjectScriptsState
    >;
  } catch {
    return {};
  }
}

/**
 * Script terminal tabs kept per project in a module-level atom rather than in
 * component state. Running a script spawns a PTY in the main process that keeps
 * going regardless of the renderer, so parking the tab layout here lets the
 * pane remember its runs — and reconnect to them — after the user navigates
 * away and back.
 *
 * Written through to localStorage as well, because the renderer reloading is
 * not the same as the run ending: the session it left behind is still going in
 * the main process, and a tab layout that reset on reload would leave no way
 * back to it. What is restored is only a claim about what was running — the
 * pane reconciles it against the sessions that are actually alive on mount.
 */
const scriptsByProjectAtom = atom<Record<string, ProjectScriptsState>>(loadPersisted());

export function useProjectScripts(projectPath: string) {
  const [byProject, setByProject] = useAtom(scriptsByProjectAtom);
  const state = byProject[projectPath] ?? freshState();

  const setState = useCallback(
    (updater: (prev: ProjectScriptsState) => ProjectScriptsState) => {
      setByProject((prev) => {
        const current = prev[projectPath] ?? freshState();
        const next = { ...prev, [projectPath]: updater(current) };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

        return next;
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
