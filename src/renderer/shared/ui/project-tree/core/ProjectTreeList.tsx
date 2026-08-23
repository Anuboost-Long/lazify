import clsx from "clsx";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ProjectTreeListItem } from "@renderer/shared/ui/project-tree/core/ProjectTreeListItem";
import { OVERSCAN_COUNT, ROW_HEIGHT } from "./project-tree-visuals";

export interface ProjectTreeListNode {
  id: string;
  name: string;
  type: "file" | "folder";
  children: ProjectTreeListNode[];
  path?: string;
}

export type ProjectTreeListDensity = "compact" | "comfortable";

interface ProjectTreeListProps<TNode extends ProjectTreeListNode> {
  nodes: TNode[];
  expandedIds: string[];
  selectedId?: string | null;
  renamingId?: string | null;
  renameValue?: string;
  density?: ProjectTreeListDensity;
  className?: string;
  emptyState?: ReactNode;
  followSelection?: boolean;
  showFileColors?: boolean;
  getNodeTitle?: (node: TNode) => string | undefined;
  isChecked?: (nodeId: string) => boolean;
  onSelect: (node: TNode) => void;
  onToggleExpand: (node: TNode) => void;
  onToggleChecked?: (node: TNode) => void;
  onOpenContextMenu?: (
    event: React.MouseEvent<HTMLButtonElement>,
    node: TNode
  ) => void;
  onRenameValueChange?: (value: string) => void;
  onCommitRename?: () => void;
  onCancelRename?: () => void;
}

interface VisibleRow<TNode> {
  node: TNode;
  depth: number;
}

function flattenVisibleRows<TNode extends ProjectTreeListNode>(
  nodes: TNode[],
  expandedIds: Set<string>,
  depth = 0
): VisibleRow<TNode>[] {
  const rows: VisibleRow<TNode>[] = [];

  for (const node of nodes) {
    rows.push({ node, depth });

    if (node.type === "folder" && expandedIds.has(node.id)) {
      rows.push(
        ...flattenVisibleRows(node.children as TNode[], expandedIds, depth + 1)
      );
    }
  }

  return rows;
}

export function ProjectTreeList<TNode extends ProjectTreeListNode>({
  nodes,
  expandedIds,
  selectedId = null,
  renamingId = null,
  renameValue = "",
  density = "comfortable",
  className,
  emptyState = null,
  followSelection = true,
  showFileColors = true,
  getNodeTitle = (node) => node.path,
  isChecked,
  onSelect,
  onToggleExpand,
  onToggleChecked,
  onOpenContextMenu,
  onRenameValueChange,
  onCommitRename,
  onCancelRename,
}: Readonly<ProjectTreeListProps<TNode>>) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(480);
  const rowHeight = density === "compact" ? 28 : ROW_HEIGHT;
  const expandedSet = useMemo(() => new Set(expandedIds), [expandedIds]);
  const visibleRows = useMemo(
    () => flattenVisibleRows(nodes, expandedSet),
    [nodes, expandedSet]
  );
  const totalHeight = visibleRows.length * rowHeight;
  const clampedScrollTop = Math.min(
    scrollTop,
    Math.max(0, totalHeight - viewportHeight)
  );
  const startIndex = Math.max(
    0,
    Math.floor(clampedScrollTop / rowHeight) - OVERSCAN_COUNT
  );
  const endIndex = Math.min(
    visibleRows.length,
    Math.ceil((clampedScrollTop + viewportHeight) / rowHeight) + OVERSCAN_COUNT
  );
  const virtualRows = visibleRows.slice(startIndex, endIndex);
  const topSpacerHeight = startIndex * rowHeight;
  const showInclusionControl = isChecked !== undefined;

  useEffect(() => {
    if (listRef.current) setScrollTop(listRef.current.scrollTop);
  }, [expandedIds]);

  useEffect(() => {
    const element = listRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const updateHeight = () => setViewportHeight(element.clientHeight);
    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const element = listRef.current;
    if (!followSelection || !element || !selectedId) return;

    const index = visibleRows.findIndex((row) => row.node.id === selectedId);
    if (index === -1) return;

    const rowTop = index * rowHeight;
    const rowBottom = rowTop + rowHeight;

    if (rowTop < element.scrollTop) {
      element.scrollTop = rowTop;
    } else if (rowBottom > element.scrollTop + element.clientHeight) {
      element.scrollTop = rowBottom - element.clientHeight;
    }
  }, [followSelection, rowHeight, selectedId, visibleRows]);

  if (visibleRows.length === 0) return emptyState;

  return (
    <div
      ref={listRef}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      className={clsx("min-h-0 overflow-y-auto", className)}
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
            <ProjectTreeListItem
              key={node.id}
              node={node}
              title={getNodeTitle(node)}
              depth={depth}
              height={rowHeight}
              density={density}
              selected={selectedId === node.id}
              expanded={expandedSet.has(node.id)}
              renaming={renamingId === node.id}
              renameValue={renameValue}
              checked={showInclusionControl ? isChecked?.(node.id) ?? false : undefined}
              showInclusionControl={showInclusionControl}
              showFileColors={showFileColors}
              onSelect={() => onSelect(node)}
              onToggleExpand={() => onToggleExpand(node)}
              onToggleChecked={
                onToggleChecked ? () => onToggleChecked(node) : undefined
              }
              onOpenContextMenu={
                onOpenContextMenu
                  ? (event) => onOpenContextMenu(event, node)
                  : undefined
              }
              onRenameValueChange={onRenameValueChange}
              onCommitRename={onCommitRename}
              onCancelRename={onCancelRename}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
