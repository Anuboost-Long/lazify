import { contextType, renderContext } from "./context-types";
import type { ContextEntry } from "./types";

/**
 * Which entries a prompt gets: switched on, in this project, and aimed at this
 * preset or at everything.
 */
export function selectEntries(
  entries: ContextEntry[],
  scope: { projectPath: string; presetId: string | null }
): ContextEntry[] {
  return entries
    .filter((entry) => entry.isActive)
    .filter((entry) => entry.scope === "global" || entry.scopeKey === scope.projectPath)
    .filter(
      (entry) =>
        entry.appliesTo.length === 0 ||
        (scope.presetId !== null && entry.appliesTo.includes(scope.presetId))
    )
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

function lines(entries: ContextEntry[], section: "context" | "rules"): string {
  return entries
    .filter((entry) => contextType(entry.type).section === section)
    .map((entry) => renderContext(entry.type, entry.payload))
    .filter(Boolean)
    .map((line) => `- ${line}`)
    .join("\n");
}

/** What the project is: facts, commands and paths. */
export function formatFacts(entries: ContextEntry[]): string {
  return lines(entries, "context");
}

/** What must hold: the rules, each carrying its own force. */
export function formatRules(entries: ContextEntry[]): string {
  return lines(entries, "rules");
}
