import clsx from "clsx";

import { translation } from "@renderer/i18n/translation";
import { MonoText } from "@renderer/shared/typography";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { getFileVisual, ROW_HEIGHT } from "@renderer/shared/ui/project-tree/core/project-tree-visuals";
import type { GitStatusEntry } from "@renderer/shared/types/lazify";

import { isStaged, statusChar, statusToneClass } from "./status-visual";
import { RowAction } from "./RowAction";

interface GitStatusRowProps {
  entry: GitStatusEntry;
  name: string;
  directory?: string;
  depth: number;
  selected: boolean;
  group: "staged" | "unstaged";
  onSelect: (entry: GitStatusEntry) => void;
  onStage: (entry: GitStatusEntry) => void;
  onUnstage: (entry: GitStatusEntry) => void;
  onDiscard: (entry: GitStatusEntry) => void;
}

export function GitStatusRow({
  entry,
  name,
  directory,
  depth,
  selected,
  group,
  onSelect,
  onStage,
  onUnstage,
  onDiscard
}: Readonly<GitStatusRowProps>) {
  const visual = getFileVisual(name);

  return (
    <div
      style={{ height: ROW_HEIGHT }}
      className={clsx(
        "group/row flex w-full items-center gap-2 rounded-xl pr-2 transition-colors duration-100",
        selected ? "bg-accent/15 text-text" : "text-text/80 hover:bg-accent/[0.06] hover:text-text"
      )}
    >
      <Tooltip content={entry.path} side="top">
        <button
          type="button"
          onClick={() => onSelect(entry)}
          style={{ paddingLeft: `${12 + depth * 18}px` }}
          className="flex h-full min-w-0 flex-1 items-center gap-2 text-left"
        >
          <UiIcon name={visual.icon} className={clsx("h-4 w-4 shrink-0", visual.color)} />

          <MonoText as="span" className="min-w-0 shrink truncate text-sm">
            {name}
          </MonoText>

          {directory ? (
            <MonoText as="span" className="min-w-0 flex-1 truncate text-[11px] text-muted/70">
              {directory}
            </MonoText>
          ) : (
            <span className="flex-1" />
          )}
        </button>
      </Tooltip>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100">
        {group === "unstaged" ? (
          <>
            <RowAction
              icon="trash"
              label={translation.GitStatus.Discard}
              destructive
              onClick={() => onDiscard(entry)}
            />
            <RowAction
              icon="plus"
              label={translation.GitStatus.Stage}
              onClick={() => onStage(entry)}
            />
          </>
        ) : (
          <RowAction
            icon="arrow-left"
            label={translation.GitStatus.Unstage}
            onClick={() => onUnstage(entry)}
          />
        )}
      </div>

      {isStaged(entry) && group === "unstaged" ? (
        <span aria-hidden title="Staged" className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
      ) : null}

      <MonoText
        as="span"
        className={clsx("w-3 shrink-0 text-center text-xs font-bold", statusToneClass(entry))}
      >
        {statusChar(entry)}
      </MonoText>
    </div>
  );
}
