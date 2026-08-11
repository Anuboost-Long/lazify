import { atom, useAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";

import type { AgentFileChange } from "@renderer/shared/types/lazify";

const POLL_MS = 4000;

function signature(change: AgentFileChange) {
  return `${change.statusLabel}:${change.additions}:${change.deletions}`;
}

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

  const resetBaseline = useCallback(async () => {
    if (!projectPath) return;

    setChanges(await captureBaseline(projectPath));
  }, [captureBaseline, projectPath]);

  useEffect(() => {
    if (!projectPath || baselines[projectPath]) return;

    void captureBaseline(projectPath);
  }, [baselines, captureBaseline, projectPath]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
