import type { GitStatusEntry } from "@renderer/shared/types/lazify";

/**
 * Splits git's status into the two groups a source control view shows.
 *
 * A file can appear in both: `MM` means it was staged and then modified again,
 * and git tracks those as two separate states of the same path. Showing it
 * twice is correct — staging it again is a different action from discarding
 * the unstaged part.
 */

export interface GroupedEntries {
  staged: GitStatusEntry[];
  unstaged: GitStatusEntry[];
}

/** Untracked files count as unstaged; `?` is not a staged state. */
function hasStaged(entry: GitStatusEntry): boolean {
  const code = entry.stagedStatus.trim();

  return code !== "" && code !== "?";
}

function hasUnstaged(entry: GitStatusEntry): boolean {
  return entry.unstagedStatus.trim() !== "";
}

export function groupEntries(entries: GitStatusEntry[]): GroupedEntries {
  return {
    staged: entries.filter(hasStaged),
    unstaged: entries.filter(hasUnstaged)
  };
}
