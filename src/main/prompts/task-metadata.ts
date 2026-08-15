import type { PromptPriority } from "./types";

/**
 * Priority and deadline, as an agent can act on them.
 *
 * Priority is only ever about order — what to do first — so it renders as the
 * instruction rather than as the label: an agent handed "high" has been told
 * nothing, while an agent told to start with this before other work has.
 * Normal is the default and renders to nothing, so the ordinary task carries no
 * line about being ordinary.
 */
const PRIORITY_LINES: Record<PromptPriority, string> = {
  high: "Start with this before other outstanding work.",
  normal: "",
  low: "This can wait behind other outstanding work."
};

export function formatPriority(priority: PromptPriority | undefined): string {
  return priority ? PRIORITY_LINES[priority] ?? "" : "";
}

/** The date as stored, so the same task never renders two different prompts. */
export function formatDeadline(deadline: string | null | undefined): string {
  return (deadline ?? "").trim();
}
