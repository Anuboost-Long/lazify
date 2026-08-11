import { useCallback, useEffect, useState } from "react";

import type { AgentUsageReport } from "@renderer/shared/types/lazify";

const SESSION_STARTED_AT = new Date().toISOString();

export function useAgentUsage(isOpen: boolean, agentIds: string[] = []) {
  const [report, setReport] = useState<AgentUsageReport | null>(null);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (!isOpen) return;

    void refresh();

    const watched = agentKey ? agentKey.split(",") : null;

    return globalThis.lazify.onAgentActivity(({ agentId }) => {
      if (watched && !watched.includes(agentId)) return;
      void refreshAgent(agentId);
    });
  }, [isOpen, refresh, refreshAgent, agentKey]);

  return { report, loading, refresh, setBudget, sessionStartedAt: SESSION_STARTED_AT };
}
