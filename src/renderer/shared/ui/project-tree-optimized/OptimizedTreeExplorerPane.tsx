import clsx from "clsx";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TextInput } from "@renderer/shared/ui/form/FormInput";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { getFileVisual, ROW_HEIGHT, OVERSCAN_COUNT } from "@renderer/shared/ui/project-tree-optimized/tree-utils-editable";

// Structural base — both ProjectTreeNode and ImportedProjectIndexNode satisfy this
export interface ExplorerNode {
  id: string;
  name: string;
  type: "file" | "folder";
  children: ExplorerNode[];
}

function countNodes(nodes: ExplorerNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countNodes(node.children), 0);
}

function flattenVisibleRows(
  nodes: ExplorerNode[],
  expandedIds: Set<string>,
  depth = 0
): Array<{ node: ExplorerNode; depth: number }> {
  const rows: Array<{ node: ExplorerNode; depth: number }> = [];

  for (const node of nodes) {
    rows.push({ node, depth });

    if (node.type === "folder" && expandedIds.has(node.id)) {
      rows.push(...flattenVisibleRows(node.children, expandedIds, depth + 1));
    }
  }

  return rows;
}

interface TreeRowProps {
  node: ExplorerNode;
  depth: number;
  selected: boolean;
  expanded: boolean;
  isRenaming: boolean;
  renameValue: string;
  isEditable: boolean;
  isChecked?: boolean;
  showInclusionControls: boolean;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onToggleChecked?: (id: string) => void;
  onOpenContextMenu?: (event: React.MouseEvent<HTMLButtonElement>, nodeId: string) => void;
  onRenameValueChange?: (value: string) => void;
  onCommitRename?: () => void;
  onCancelRename?: () => void;
}

const TreeRow = memo(function TreeRow({
  node,
  depth,
  selected,
  expanded,
  isRenaming,
  renameValue,
  isEditable,
  isChecked,
  showInclusionControls,
  onSelect,
  onToggleExpand,
  onToggleChecked,
  onOpenContextMenu,
  onRenameValueChange,
  onCommitRename,
  onCancelRename,
}: TreeRowProps) {
  const hasChildren = node.type === "folder" && node.children.length > 0;
  const fileVisual = node.type === "file" ? getFileVisual(node.name) : null;

  return (
    <button
      type="button"
      onContextMenu={
        isEditable && onOpenContextMenu
          ? (event) => {
              event.preventDefault();
              onOpenContextMenu(event, node.id);
            }
          : undefined
      }
      onClick={() => {
        onSelect(node.id);

        if (node.type === "folder") {
          onToggleExpand(node.id);
        }
      }}
      className={clsx(
        "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left",
        selected ? "bg-cyan-400/15 text-cyan-50" : "text-slate-100 hover:bg-white/[0.05]"
      )}
      style={{ height: ROW_HEIGHT, paddingLeft: `${12 + depth * 18}px` }}
    >
      {showInclusionControls ? (
        <span
          role="checkbox"
          aria-checked={isChecked}
          onClick={(event) => {
            event.stopPropagation();
            onToggleChecked?.(node.id);
          }}
          className={clsx(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold",
            isChecked
              ? "border-emerald-300/70 bg-emerald-400/20 text-emerald-100"
              : "border-white/20 bg-white/[0.03] text-transparent"
          )}
        >
          ✓
        </span>
      ) : null}

      <span className="w-3 text-center text-[10px] text-[#7ca6bb]">
        {node.type === "folder" ? (expanded ? "▾" : hasChildren ? "▸" : "•") : "•"}
      </span>

      <UiIcon
        name={node.type === "folder" ? "folder" : fileVisual!.icon}
        className={clsx(
          "h-4 w-4 shrink-0",
          node.type === "folder" ? "text-cyan-300" : fileVisual!.color
        )}
      />

      {isRenaming ? (
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
        <span className="min-w-0 flex-1 truncate font-mono text-sm">{node.name}</span>
      )}
    </button>
  );
});

export interface OptimizedTreeExplorerPaneProps {
  mode?: "editable" | "readonly";
  busy?: boolean;
  savedProjectName: string;
  subLabel: string;
  infoBanner?: string;
  tree: ExplorerNode[];
  expandedIds: string[];
  selectedId: string | null;
  renamingId?: string | null;
  renameValue?: string;
  // Inclusion controls (import flow)
  isChecked?: (nodeId: string) => boolean;
  onToggleChecked?: (nodeId: string) => void;
  // File counts (import flow)
  includedFileCount?: number;
  totalFileCount?: number;
  // Actions
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onCollapseAll?: () => void;
  onCreateEntry?: (type: "file" | "folder") => void;
  onOpenContextMenu?: (event: React.MouseEvent<HTMLButtonElement>, nodeId: string) => void;
  onRenameValueChange?: (value: string) => void;
  onCommitRename?: () => void;
  onCancelRename?: () => void;
}

export function OptimizedTreeExplorerPane({
  mode = "editable",
  busy = false,
  savedProjectName,
  subLabel,
  infoBanner,
  tree,
  expandedIds,
  selectedId,
  renamingId,
  renameValue = "",
  isChecked,
  onToggleChecked,
  includedFileCount,
  totalFileCount,
  onSelect,
  onToggleExpand,
  onCollapseAll,
  onCreateEntry,
  onOpenContextMenu,
  onRenameValueChange,
  onCommitRename,
  onCancelRename,
}: OptimizedTreeExplorerPaneProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(480);

  // Sync scrollTop from DOM after expand/collapse — avoids stale virtualization window
  useEffect(() => {
    if (listRef.current) {
      setScrollTop(listRef.current.scrollTop);
    }
  }, [expandedIds]);

  useEffect(() => {
    const element = listRef.current;

    if (!element) {
      return;
    }

    const updateHeight = () => setViewportHeight(element.clientHeight);
    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, []);

  const expandedSet = useMemo(() => new Set(expandedIds), [expandedIds]);
  const totalNodeCount = useMemo(() => countNodes(tree), [tree]);
  const visibleRows = useMemo(() => flattenVisibleRows(tree, expandedSet), [tree, expandedSet]);
  const totalHeight = visibleRows.length * ROW_HEIGHT;
  const clampedScrollTop = Math.min(scrollTop, Math.max(0, totalHeight - viewportHeight));
  const startIndex = Math.max(0, Math.floor(clampedScrollTop / ROW_HEIGHT) - OVERSCAN_COUNT);
  const endIndex = Math.min(
    visibleRows.length,
    Math.ceil((clampedScrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN_COUNT
  );
  const virtualRows = visibleRows.slice(startIndex, endIndex);
  const topSpacerHeight = startIndex * ROW_HEIGHT;
  const isEditable = mode === "editable";
  const showInclusionControls = isChecked !== undefined;

  const handleIsChecked = useCallback(
    (nodeId: string) => isChecked?.(nodeId) ?? false,
    [isChecked]
  );

  return (
    <div className="h-[44rem] overflow-hidden rounded-[26px] border border-border bg-[#0b1720] shadow-[0_28px_80px_rgba(3,10,18,0.32)]">
      <div className="flex items-center gap-2 border-b border-white/10 bg-[#102230] px-5 py-3.5">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8ab6cb]">
          Explorer
        </div>
        <div className="ml-auto flex items-center gap-2">
          {isEditable && onCreateEntry ? (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onCreateEntry("file");
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-200"
                aria-label="New file"
                title="New file"
              >
                <UiIcon name="plus" className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onCreateEntry("folder");
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-200"
                aria-label="New folder"
                title="New folder"
              >
                <UiIcon name="folder" className="h-4 w-4" />
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex h-[calc(44rem-57px)] flex-col bg-[linear-gradient(180deg,#0f2230_0%,#0a141d_100%)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7ca6bb]">
          {savedProjectName}
        </p>
        <div className="mt-4 space-y-2">
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            {savedProjectName}/
          </div>
          <div className="rounded-xl border border-dashed border-white/10 px-3 py-2 text-xs text-[#88a7b6]">
            {subLabel}
          </div>
        </div>

        {infoBanner ? (
          <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
            {infoBanner}
          </div>
        ) : null}

        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9fc6d8]">
            {totalNodeCount} items
          </div>
          {onCollapseAll ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onCollapseAll();
              }}
              title="Collapse all folders"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[#9fc6d8] hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-200"
            >
              <UiIcon name="collapse" className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {includedFileCount !== undefined && totalFileCount !== undefined ? (
          <div className="mt-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
            {includedFileCount}/{totalFileCount} files kept
          </div>
        ) : null}

        <div
          ref={listRef}
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
          className="mt-5 min-h-0 flex-1 overflow-y-auto"
        >
          <div style={{ height: totalHeight, position: "relative" }}>
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                transform: `translateY(${topSpacerHeight}px)`,
              }}
            >
              {virtualRows.map(({ node, depth }) => (
                <TreeRow
                  key={node.id}
                  node={node}
                  depth={depth}
                  selected={selectedId === node.id}
                  expanded={expandedSet.has(node.id)}
                  isRenaming={isEditable && renamingId === node.id}
                  renameValue={renameValue}
                  isEditable={isEditable}
                  isChecked={showInclusionControls ? handleIsChecked(node.id) : undefined}
                  showInclusionControls={showInclusionControls}
                  onSelect={onSelect}
                  onToggleExpand={onToggleExpand}
                  onToggleChecked={onToggleChecked}
                  onOpenContextMenu={onOpenContextMenu}
                  onRenameValueChange={onRenameValueChange}
                  onCommitRename={onCommitRename}
                  onCancelRename={onCancelRename}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
