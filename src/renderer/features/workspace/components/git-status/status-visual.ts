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
  const code = (unstaged || staged || "M").slice(0, 1);

  return code === "?" ? "A" : code;
}

export function statusToneClass(entry: GitStatusEntry): string {
  const codes = `${entry.stagedStatus}${entry.unstagedStatus}`;

  if (codes.includes("D")) return "text-error";
  if (codes.includes("A") || codes.includes("?")) return "text-success";
  if (codes.includes("R")) return "text-warning";

  return "text-warning";
}

/** Staged changes get a filled dot, like the staged group in VS Code. */
export function isStaged(entry: GitStatusEntry): boolean {
  return entry.stagedStatus.trim() !== "" && entry.stagedStatus !== "?";
}
