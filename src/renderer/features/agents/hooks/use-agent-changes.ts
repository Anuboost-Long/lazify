import { atom, useAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";

import type { AgentFileChange } from "@renderer/shared/types/lazify";

/** How often the panel re-reads the working tree while it is open. */
const POLL_MS = 4000;

/** What the file looked like at baseline; a different signature means it moved since. */
function signature(change: AgentFileChange) {
  return `${change.statusLabel}:${change.additions}:${change.deletions}`;
}

/**
 * Baselines live at module level so the "session" survives leaving the Agents
 * page — it starts the first time a project is opened here and only resets when
 * the user asks for it.
 */
const baselineAtom = atom<Record<string, { capturedAt: number; files: Record<string, string> }>>(
  {}
);

export function useAgentChanges(projectPath: string, isOpen: boolean) {
  const [baselines, setBaselines] = useAtom(baselineAtom);
  const [changes, setChanges] = useState<AgentFileChange[]>([]);
  const [loading, setLoading] = useState(false);

  const baseline = projectPath ? baselines[projectPath] : undefined;

  const captureBaseline = useCallback(
    async (path: string) => {
      const current = await globalThis.lazify.getWorkingChanges(path);

      setBaselines((previous) => ({
        ...previous,
        [path]: {
          capturedAt: Date.now(),
          files: Object.fromEntries(current.map((change) => [change.path, signature(change)]))
        }
      }));

      return current;
    },
    [setBaselines]
  );

  const refresh = useCallback(async () => {
    if (!projectPath) {
      setChanges([]);
      return;
    }

    setLoading(true);
    try {
      setChanges(await globalThis.lazify.getWorkingChanges(projectPath));
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  /** Forget everything before now, so the list starts empty again. */
  const resetBaseline = useCallback(async () => {
    if (!projectPath) return;

    setChanges(await captureBaseline(projectPath));
  }, [captureBaseline, projectPath]);

  // Start the session clock the first time we see this project.
  useEffect(() => {
    if (!projectPath || baselines[projectPath]) return;

    void captureBaseline(projectPath);
  }, [baselines, captureBaseline, projectPath]);

  // One read per project keeps the tab bar badge honest…
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // …but the repeat polling only runs while the panel is actually visible.
  useEffect(() => {
    if (!isOpen || !projectPath) return;

    const timer = window.setInterval(() => void refresh(), POLL_MS);

    return () => window.clearInterval(timer);
  }, [isOpen, projectPath, refresh]);

  const sessionChanges = changes.filter(
    (change) => baseline?.files[change.path] !== signature(change)
  );

  return {
    sessionChanges,
    loading,
    startedAt: baseline?.capturedAt ?? null,
    refresh,
    resetBaseline
  };
}
