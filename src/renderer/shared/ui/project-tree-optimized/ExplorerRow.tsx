import clsx from "clsx";
import { memo } from "react";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { ImportedProjectIndexNode } from "@renderer/shared/types/lazify";
import { getFileVisual, ROW_HEIGHT } from "@renderer/shared/ui/project-tree-optimized/tree-utils";
import type { VisibleRow } from "@renderer/shared/ui/project-tree-optimized/types";

interface ExplorerRowProps {
  row: VisibleRow;
  selectedId: string | null;
  expandedIds: Set<string>;
  onSelect: (node: ImportedProjectIndexNode) => void;
  onToggleExpand: (nodeId: string) => void;
}

export const ExplorerRow = memo(function ExplorerRow({
  row,
  selectedId,
  expandedIds,
  onSelect,
  onToggleExpand
}: ExplorerRowProps) {
  const { node, depth } = row;
  const selected = selectedId === node.id;
  const expanded = node.type === "folder" ? expandedIds.has(node.id) : false;
  const hasChildren = node.type === "folder" && node.children.length > 0;
  const fileVisual = node.type === "file" ? getFileVisual(node.name) : null;

  return (
    <button
      type="button"
      onClick={() => {
        onSelect(node);

        if (node.type === "folder") {
          onToggleExpand(node.id);
        }
      }}
      className={clsx(
        "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition",
        selected ? "bg-cyan-400/15 text-cyan-50" : "text-slate-100 hover:bg-white/[0.05]"
      )}
      style={{
        height: ROW_HEIGHT,
        paddingLeft: `${12 + depth * 18}px`
      }}
      data-path={node.absolutePath}
      title={node.absolutePath}
    >
      <span className="w-3 text-center text-[10px] text-[#7ca6bb]">
        {node.type === "folder" ? (expanded ? "▾" : hasChildren ? "▸" : "•") : "•"}
      </span>
      <UiIcon
        name={node.type === "folder" ? "folder" : fileVisual!.icon}
        className={clsx("h-4 w-4 shrink-0", node.type === "folder" ? "text-amber-300" : fileVisual!.color)}
      />
      <span className="truncate font-mono text-sm">{node.name}</span>
    </button>
  );
});
