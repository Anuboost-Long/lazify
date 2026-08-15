import { atom, useAtom, useSetAtom } from "jotai";
import { useCallback, useEffect } from "react";

import type { AutopilotHold } from "../../../../main/agents/autopilot-policy";

export type AgentActivityKind = "waiting" | "done" | "autopilot";

export interface AgentActivityEntry {
  id: string;
  kind: AgentActivityKind;
  runId: string;
  projectPath: string;
  projectName: string;
  agentLabel: string;

  at: number;

  question?: string;

  optionLabel?: string;

  hold?: AutopilotHold | null;
}

const MAX_ENTRIES = 200;

const activityAtom = atom<AgentActivityEntry[]>([]);

const lastReadAtAtom = atom(Date.now());

export function useAgentActivityRecorder(): void {
  const setActivity = useSetAtom(activityAtom);

  const record = useCallback(
    (entry: Omit<AgentActivityEntry, "id" | "at">) => {
      setActivity((current) =>
        [
          {
            ...entry,
            id: `${entry.runId}-${entry.kind}-${Date.now()}-${current.length}`,
            at: Date.now(),
          },
          ...current,
        ].slice(0, MAX_ENTRIES),
      );
    },
    [setActivity],
  );

  useEffect(() => {
    return globalThis.lazify.onAgentAttention((event) => {
      if (!event.waiting) return;

      record({
        kind: "waiting",
        runId: event.runId,
        projectPath: event.projectPath,
        projectName: event.projectName,
        agentLabel: event.agentLabel,
        hold: event.hold,
      });
    });
  }, [record]);

  useEffect(() => {
    return globalThis.lazify.onAutopilotAnswered((event) => {
      record({
        kind: "autopilot",
        runId: event.runId,
        projectPath: event.projectPath,
        projectName: event.projectName,
        agentLabel: event.agentLabel,
        question: event.question,
        optionLabel: event.optionLabel,
      });
    });
  }, [record]);

  useEffect(() => {
    return globalThis.lazify.onAgentDone((event) => {
      record({
        kind: "done",
        runId: event.runId,
        projectPath: event.projectPath,
        projectName: event.projectName,
        agentLabel: event.agentLabel,
      });

      // Any task run this agent was still holding open is over. The task keeps
      // its own status: the agent's turn ending is not the work being finished.
      void globalThis.lazify.completeAgentTaskRuns(event.runId);
    });
  }, [record]);
}

export function useAgentActivity() {
  const [entries, setEntries] = useAtom(activityAtom);
  const [lastReadAt, setLastReadAt] = useAtom(lastReadAtAtom);

  const unreadCount = entries.filter(
    (entry) => entry.at > lastReadAt && entry.kind !== "autopilot",
  ).length;

  return {
    entries,
    unreadCount,

    markRead: useCallback(() => setLastReadAt(Date.now()), [setLastReadAt]),
    clear: useCallback(() => setEntries([]), [setEntries]),
  };
}
