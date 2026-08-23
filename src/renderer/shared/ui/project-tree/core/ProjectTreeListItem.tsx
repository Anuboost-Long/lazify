import clsx from "clsx";
import { memo } from "react";

import { MonoText } from "@renderer/shared/typography";
import { TextInput } from "@renderer/shared/ui/form/FormInput";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { getFileVisual } from "./project-tree-visuals";
import type {
  ProjectTreeListDensity,
  ProjectTreeListNode,
} from "@renderer/shared/ui/project-tree/core/ProjectTreeList";

interface ProjectTreeListItemProps {
  node: ProjectTreeListNode;
  title?: string;
  depth: number;
  height: number;
  density: ProjectTreeListDensity;
  selected: boolean;
  expanded: boolean;
  renaming: boolean;
  renameValue: string;
  checked?: boolean;
  showInclusionControl: boolean;
  showFileColors: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onToggleChecked?: () => void;
  onOpenContextMenu?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onRenameValueChange?: (value: string) => void;
  onCommitRename?: () => void;
  onCancelRename?: () => void;
}

export const ProjectTreeListItem = memo(function ProjectTreeListItem({
  node,
  title,
  depth,
  height,
  density,
  selected,
  expanded,
  renaming,
  renameValue,
  checked,
  showInclusionControl,
  showFileColors,
  onSelect,
  onToggleExpand,
  onToggleChecked,
  onOpenContextMenu,
  onRenameValueChange,
  onCommitRename,
  onCancelRename,
}: Readonly<ProjectTreeListItemProps>) {
  const compact = density === "compact";
  const hasChildren = node.type === "folder" && node.children.length > 0;
  const fileVisual = node.type === "file" ? getFileVisual(node.name) : null;

  return (
    <button
      type="button"
      title={title}
      onContextMenu={
        onOpenContextMenu
          ? (event) => {
              event.preventDefault();
              onOpenContextMenu(event);
            }
          : undefined
      }
      onClick={() => {
        onSelect();
        if (node.type === "folder") onToggleExpand();
      }}
      className={clsx(
        "flex w-full items-center text-left transition-colors duration-100",
        compact ? "gap-1.5 rounded-lg py-1 pr-1.5" : "gap-2 rounded-xl px-3 py-2",
        selected
          ? "bg-accent/15 text-text"
          : "text-text/80 hover:bg-accent/[0.06] hover:text-text"
      )}
      style={{
        height,
        paddingLeft: compact ? `${6 + depth * 10}px` : `${12 + depth * 18}px`,
      }}
    >
      {showInclusionControl ? (
        <span
          role="checkbox"
          aria-checked={checked}
          onClick={(event) => {
            event.stopPropagation();
            onToggleChecked?.();
          }}
          className={clsx(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold",
            checked
              ? "border-accent/60 bg-accent/20 text-text"
              : "border-border bg-transparent text-transparent"
          )}
        >
          ✓
        </span>
      ) : null}

      <span className="w-3 text-center text-[10px] text-muted/60">
        {node.type === "folder" ? (expanded ? "▾" : hasChildren ? "▸" : "•") : "•"}
      </span>

      <UiIcon
        name={node.type === "folder" ? "folder" : fileVisual!.icon}
        className={clsx(
          "shrink-0",
          compact ? "h-3 w-3" : "h-4 w-4",
          node.type === "folder"
            ? compact
              ? "text-accent/70"
              : "text-accent"
            : showFileColors
              ? fileVisual!.color
              : "text-muted"
        )}
      />

      {renaming ? (
        <TextInput
          autoFocus
          value={renameValue}
          onChange={(event) => onRenameValueChange?.(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onBlur={onCommitRename}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onCommitRename?.();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              onCancelRename?.();
            }
          }}
          variant="inverse"
          size="sm"
          className="min-w-0 flex-1"
          inputClassName="font-mono"
        />
      ) : (
        <MonoText
          as="span"
          className={clsx("min-w-0 flex-1 truncate", compact ? "text-xs" : "text-sm")}
        >
          {node.name}
        </MonoText>
      )}
    </button>
  );
});
