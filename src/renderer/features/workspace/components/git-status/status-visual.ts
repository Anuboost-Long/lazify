import type { GitStatusEntry } from "@renderer/shared/types/lazify";

/**
 * How a change is marked in the sidebar: a single letter and a colour, the
 * way git and VS Code both label them. The full wording stays in the git info
 * sheet, where there is room for it.
 */

/** The unstaged code wins — it is what the working tree currently shows. */
export function statusChar(entry: GitStatusEntry): string {
  const unstaged = entry.unstagedStatus.trim();
  const staged = entry.stagedStatus.trim();

  return (unstaged || staged || "M").slice(0, 1);
}

export function statusToneClass(entry: GitStatusEntry): string {
  const codes = `${entry.stagedStatus}${entry.unstagedStatus}`;

  if (codes.includes("D")) return "text-error";
  if (codes.includes("A")) return "text-accent";
  if (codes.includes("R")) return "text-warning";
  if (codes.includes("?")) return "text-muted";

  // Modified
  return "text-warning";
}

/** Staged changes get a filled dot, like the staged group in VS Code. */
export function isStaged(entry: GitStatusEntry): boolean {
  return entry.stagedStatus.trim() !== "" && entry.stagedStatus !== "?";
}
