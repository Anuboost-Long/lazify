import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * When an agent stops writing.
 *
 * Claude Code and Codex append to their transcript as a turn runs and go quiet
 * the moment the answer lands, so a short silence after a burst of writes *is*
 * the end of a turn. Watching for that beats polling: the usage panel refreshes
 * exactly when there is something new to show, and the account APIs — which are
 * metered, and answer 429 when asked every few seconds — are left alone while
 * nothing is happening.
 *
 * Each agent is watched on its own, so a Codex turn never sends anyone to ask
 * Claude's account about a window that cannot have moved.
 */

/** Silence that marks the end of a turn rather than a pause mid-stream. */
const SETTLE_MS = 4_000;
/** Never report the same agent more often than this, however busy it gets. */
const MIN_GAP_MS = 20_000;

const TRANSCRIPT_ROOTS: { agentId: string; root: string }[] = [
  { agentId: "claude", root: path.join(os.homedir(), ".claude", "projects") },
  { agentId: "codex", root: path.join(os.homedir(), ".codex", "sessions") },
];

export interface AgentActivityEvent {
  /** The agent whose turn just ended — only its usage needs re-reading. */
  agentId: string;
}

export function watchAgentActivity(
  onTurnSettled: (event: AgentActivityEvent) => void,
): () => void {
  const watchers: fs.FSWatcher[] = [];
  const timers = new Map<string, NodeJS.Timeout>();
  const lastFiredMs = new Map<string, number>();

  const fire = (agentId: string) => {
    timers.delete(agentId);
    const sinceLast = Date.now() - (lastFiredMs.get(agentId) ?? 0);

    // Too soon after the last one — wait out the remainder instead of dropping
    // the signal, so the final turn of a busy stretch still lands.
    if (sinceLast < MIN_GAP_MS) {
      timers.set(
        agentId,
        setTimeout(() => fire(agentId), MIN_GAP_MS - sinceLast),
      );
      return;
    }

    lastFiredMs.set(agentId, Date.now());
    onTurnSettled({ agentId });
  };

  const settle = (agentId: string) => {
    const pending = timers.get(agentId);
    if (pending) clearTimeout(pending);
    timers.set(
      agentId,
      setTimeout(() => fire(agentId), SETTLE_MS),
    );
  };

  for (const { agentId, root } of TRANSCRIPT_ROOTS) {
    try {
      watchers.push(
        fs.watch(root, { recursive: true, persistent: false }, (_event, file) => {
          if (file && !String(file).endsWith(".jsonl")) return;
          settle(agentId);
        }),
      );
    } catch {
      // That agent has never run on this machine, so there is nothing to watch.
    }
  }

  return () => {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    for (const watcher of watchers) watcher.close();
  };
}
