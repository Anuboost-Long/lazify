import type { GitStatusEntry } from "@renderer/shared/types/lazify";

import { GitStatusRow } from "./GitStatusRow";

/**
 * Flat view: every changed file as one row, with its folder dimmed after the
 * name so two files of the same name stay distinguishable.
 */

interface GitStatusListProps {
  entries: GitStatusEntry[];
  selectedPath: string | null;
  group: "staged" | "unstaged";
  onSelect: (entry: GitStatusEntry) => void;
  onStage: (entry: GitStatusEntry) => void;
  onUnstage: (entry: GitStatusEntry) => void;
  onDiscard: (entry: GitStatusEntry) => void;
}

function splitPath(path: string) {
  const index = path.lastIndexOf("/");

  return index === -1
    ? { name: path, directory: "" }
    : { name: path.slice(index + 1), directory: path.slice(0, index) };
}

export function GitStatusList({
  entries,
  selectedPath,
  group,
  onSelect,
  onStage,
  onUnstage,
  onDiscard
}: Readonly<GitStatusListProps>) {
  return (
    <div className="flex flex-col">
      {entries.map((entry) => {
        const { name, directory } = splitPath(entry.path);

        return (
          <GitStatusRow
            key={`${entry.absolutePath}-${entry.stagedStatus}-${entry.unstagedStatus}`}
            entry={entry}
            name={name}
            directory={directory}
            depth={0}
            selected={selectedPath === entry.absolutePath}
            group={group}
            onSelect={onSelect}
            onStage={onStage}
            onUnstage={onUnstage}
            onDiscard={onDiscard}
          />
        );
      })}
    </div>
  );
}
