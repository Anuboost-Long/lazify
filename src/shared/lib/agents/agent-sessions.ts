/**
 * Past conversations, so a session can be picked up instead of restarted.
 *
 * Both CLIs already keep every session as a JSONL transcript on disk — Claude
 * under a directory named after the project, Codex under a date tree with the
 * project recorded inside each file. Reading them is enough to offer "carry on
 * where you left off"; resuming itself is the CLI's own flag.
 *
 * Only the head of a transcript is ever read: the opening prompt is what the
 * list shows, and these files grow to megabytes.
 */

export interface AgentSessionSummary {
  /** Which CLI owns the session, and so which resume flag applies. */
  agentId: string;
  sessionId: string;
  /** The prompt the session opened with, for recognising it. Can be empty. */
  title: string;
  /** Epoch ms of the last write, i.e. when it was last worked in. */
  updatedAt: number;
}
