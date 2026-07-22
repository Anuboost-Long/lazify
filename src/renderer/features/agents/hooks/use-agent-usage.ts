import { useCallback, useEffect, useState } from "react";

import type { AgentUsageReport } from "@renderer/shared/types/lazify";

/** Refresh cadence while the usage panel is open. */
const POLL_MS = 15000;

/**
 * "This session" means since the app was opened — the transcripts are the only
 * source of truth here and they are timestamped, so anything the agents wrote
 * after this moment belongs to the current run.
 */
const SESSION_STARTED_AT = new Date().toISOString();

export function useAgentUsage(isOpen: boolean) {
  const [report, setReport] = useState<AgentUsageReport | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await globalThis.lazify.getAgentUsage(SESSION_STARTED_AT));
    } finally {
      setLoading(false);
    }
  }, []);

  const setBudget = useCallback(
    async (agentId: string, weeklyTokens: number) => {
      await globalThis.lazify.setAgentBudget(agentId, weeklyTokens);
      await refresh();
    },
    [refresh]
  );

  // The first scan reads every transcript, so only run it on demand.
  useEffect(() => {
    if (!isOpen) return;

    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_MS);

    return () => window.clearInterval(timer);
  }, [isOpen, refresh]);

  return { report, loading, refresh, setBudget, sessionStartedAt: SESSION_STARTED_AT };
}
