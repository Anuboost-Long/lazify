import clsx from "clsx";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { translation } from "@renderer/i18n/translation";
import { MonoText, OverlineText, PillText } from "@renderer/shared/typography";
import { TextInput } from "@renderer/shared/ui/form/FormInput";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { getFileVisual, ROW_HEIGHT, OVERSCAN_COUNT } from "@renderer/shared/ui/project-tree-optimized/tree-utils-editable";
import { useTranslation } from "react-i18next";

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
        if (node.type === "folder") onToggleExpand(node.id);
      }}
      className={clsx(
        "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors duration-100",
        selected
          ? "bg-accent/15 text-text"
          : "text-text/80 hover:bg-accent/[0.06] hover:text-text"
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
          "h-4 w-4 shrink-0",
          node.type === "folder" ? "text-accent" : fileVisual!.color
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
            if (event.key === "Enter") { event.preventDefault(); onCommitRename?.(); }
            if (event.key === "Escape") { event.preventDefault(); onCancelRename?.(); }
          }}
          variant="inverse"
          size="sm"
          className="min-w-0 flex-1"
          inputClassName="font-mono"
        />
      ) : (
        <MonoText as="span" className="min-w-0 flex-1 truncate text-sm">{node.name}</MonoText>
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
  isChecked?: (nodeId: string) => boolean;
  onToggleChecked?: (nodeId: string) => void;
  includedFileCount?: number;
  totalFileCount?: number;
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
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(480);

  useEffect(() => {
    if (listRef.current) setScrollTop(listRef.current.scrollTop);
  }, [expandedIds]);

  useEffect(() => {
    const element = listRef.current;
    if (!element) return;
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
    <div className="h-[44rem] overflow-hidden rounded-[26px] border border-border bg-bg shadow-panel">

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-soft px-5 py-3.5">
        <OverlineText className="text-muted">
          {t(translation.ProjectTree.Explorer)}
        </OverlineText>
        <div className="ml-auto flex items-center gap-2">
          {isEditable && onCreateEntry ? (
            <>
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); onCreateEntry("file"); }}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-accent/25 bg-accent/10 text-accent transition-colors hover:border-accent/50 hover:bg-accent/20"
                aria-label={t(translation.ProjectTree.NewFile)}
                title={t(translation.ProjectTree.NewFile)}
              >
                <UiIcon name="plus" className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); onCreateEntry("folder"); }}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-accent/25 bg-accent/10 text-accent transition-colors hover:border-accent/50 hover:bg-accent/20"
                aria-label={t(translation.ProjectTree.NewFolder)}
                title={t(translation.ProjectTree.NewFolder)}
              >
                <UiIcon name="folder" className="h-4 w-4" />
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Body */}
      <div className="flex h-[calc(44rem-57px)] flex-col bg-bg p-4">
        <OverlineText className="text-muted">
          {savedProjectName}
        </OverlineText>

        <div className="mt-4 space-y-2">
          <div className="rounded-xl border border-accent/20 bg-accent/8 px-3 py-2 text-sm font-semibold text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            {savedProjectName}/
          </div>
          <div className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted">
            {subLabel}
          </div>
        </div>

        {infoBanner ? (
          <div className="mt-4 rounded-xl border border-accent/20 bg-accent/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            {infoBanner}
          </div>
        ) : null}

        <div className="mt-4 flex items-center gap-2">
          <PillText className="flex-1 rounded-full border border-border bg-soft px-3 py-1 text-muted">
            {t(translation.ProjectTree.ItemsCount, { count: totalNodeCount })}
          </PillText>
          {onCollapseAll ? (
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); onCollapseAll(); }}
              title={t(translation.ProjectTree.CollapseAll)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-soft text-muted transition-colors hover:border-accent/30 hover:bg-accent/10 hover:text-accent"
            >
              <UiIcon name="collapse" className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {includedFileCount !== undefined && totalFileCount !== undefined ? (
          <PillText className="mt-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-accent">
            {t(translation.ProjectTree.FilesKept, { included: includedFileCount, total: totalFileCount })}
          </PillText>
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
