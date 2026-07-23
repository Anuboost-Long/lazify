import { useCallback, useEffect, useState } from "react";

import type { AgentUsageReport } from "@renderer/shared/types/lazify";

/**
 * Nothing here runs on a timer. The panel reads once when it opens and then
 * only when an agent finishes a turn, which is the only moment the numbers can
 * have moved — the account API is metered and answers 429 if polled.
 */

/**
 * "This session" means since the app was opened — the transcripts are the only
 * source of truth here and they are timestamped, so anything the agents wrote
 * after this moment belongs to the current run.
 */
const SESSION_STARTED_AT = new Date().toISOString();

/**
 * @param agentIds the agents worth scanning — the ones the user actually has
 * open. Empty means "all of them", which is what an idle page shows.
 */
export function useAgentUsage(isOpen: boolean, agentIds: string[] = []) {
  const [report, setReport] = useState<AgentUsageReport | null>(null);
  const [loading, setLoading] = useState(false);
  // The array is rebuilt on every render, so the key is what drives refetches.
  const agentKey = agentIds.join(",");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setReport(
        await globalThis.lazify.getAgentUsage(
          SESSION_STARTED_AT,
          agentKey ? agentKey.split(",") : undefined
        )
      );
    } finally {
      setLoading(false);
    }
  }, [agentKey]);

  /**
   * Re-reads one agent and leaves the rest of the report as it was. Asking for
   * every agent would send us to every account API, and only the agent that
   * just finished a turn can have new numbers.
   */
  const refreshAgent = useCallback(async (agentId: string) => {
    const fresh = await globalThis.lazify.getAgentUsage(SESSION_STARTED_AT, [agentId]);
    const updated = fresh.agents.find((agent) => agent.agentId === agentId);
    if (!updated) return;

    setReport((previous) =>
      previous
        ? {
            ...previous,
            generatedAt: fresh.generatedAt,
            agents: previous.agents.map((agent) =>
              agent.agentId === agentId ? updated : agent
            )
          }
        : fresh
    );
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

    const watched = agentKey ? agentKey.split(",") : null;

    return globalThis.lazify.onAgentActivity(({ agentId }) => {
      // An agent the page is not showing changed nothing worth fetching.
      if (watched && !watched.includes(agentId)) return;
      void refreshAgent(agentId);
    });
  }, [isOpen, refresh, refreshAgent, agentKey]);

  return { report, loading, refresh, setBudget, sessionStartedAt: SESSION_STARTED_AT };
}
