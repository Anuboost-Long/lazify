import { atom, useAtom, useSetAtom } from "jotai";
import { useCallback, useEffect } from "react";

import type { AutopilotHold } from "../../../../main/agents/autopilot-policy";

/**
 * What an agent did, kept after the toast that announced it has gone.
 *
 * The alerts are deliberately short-lived, which is fine while the user is
 * looking and useless when they are not. This records the same events so
 * stepping away for an hour does not lose which of four projects asked a
 * question and which one finished.
 */

export type AgentActivityKind = "waiting" | "done" | "autopilot";

export interface AgentActivityEntry {
  /** Unique per row — runs report many events over their life. */
  id: string;
  kind: AgentActivityKind;
  runId: string;
  projectPath: string;
  projectName: string;
  agentLabel: string;
  /** Epoch ms, so unread is a comparison rather than a flag to maintain. */
  at: number;
  /**
   * The prompt this row is about, when one was read off the screen. Carried on
   * both kinds it applies to: it is what makes an autopilot row auditable, and
   * what lets a waiting row say what is being asked without switching tab.
   */
  question?: string;
  /** Autopilot rows: the option it picked, worded as the user would have seen it. */
  optionLabel?: string;
  /**
   * Waiting rows: why autopilot declined this one, when it looked at it. Null
   * for a prompt it never saw — autopilot off, or not an agent run.
   */
  hold?: AutopilotHold | null;
}

/** Newest first; older entries fall off the end rather than growing forever. */
const MAX_ENTRIES = 200;

/**
 * Module-level so the feed survives navigating between pages — the events it
 * is built from arrive while the user is anywhere in the app.
 */
const activityAtom = atom<AgentActivityEntry[]>([]);
/** Everything after this moment counts as unread. */
const lastReadAtAtom = atom(Date.now());

/**
 * Subscribes to the agent alerts and records them. Mounted exactly once, by
 * the shell — the agents page is only one of the places the user might be.
 */
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
      // Only the ask is worth a row: the answer is the user's own action, and
      // it is already visible as the bell going out.
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

  // What autopilot answered in the user's name. No toast behind these — not
  // being interrupted is the point — so the feed is the only place they show.
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
    });
  }, [record]);
}

/** Reads the feed, plus the unread count the rail toggle badges itself with. */
export function useAgentActivity() {
  const [entries, setEntries] = useAtom(activityAtom);
  const [lastReadAt, setLastReadAt] = useAtom(lastReadAtAtom);

  // Autopilot rows are a record, not an alert. Counting them would badge the
  // rail for every prompt it handled — trading the keypress the user was tired
  // of for a number that keeps climbing, which is no trade at all.
  const unreadCount = entries.filter(
    (entry) => entry.at > lastReadAt && entry.kind !== "autopilot",
  ).length;

  return {
    entries,
    unreadCount,
    /** Called when the panel is on screen — what is shown has been seen. */
    markRead: useCallback(() => setLastReadAt(Date.now()), [setLastReadAt]),
    clear: useCallback(() => setEntries([]), [setEntries]),
  };
}
