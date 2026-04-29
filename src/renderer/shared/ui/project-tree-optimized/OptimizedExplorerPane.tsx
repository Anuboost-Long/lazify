import { useEffect, useMemo, useRef, useState } from "react";
import { ExplorerRow } from "@renderer/shared/ui/project-tree-optimized/ExplorerRow";
import {
  countNodes,
  flattenVisibleRows,
  OVERSCAN_COUNT,
  ROW_HEIGHT
} from "@renderer/shared/ui/project-tree-optimized/tree-utils";
import type { ImportedProjectIndexNode } from "@renderer/shared/types/lazify";

interface OptimizedExplorerPaneProps {
  busy: boolean;
  projectName: string;
  projectPath: string;
  tree: ImportedProjectIndexNode[];
  expandedIds: Set<string>;
  selectedId: string | null;
  onSelect: (node: ImportedProjectIndexNode) => void;
  onToggleExpand: (nodeId: string) => void;
}

export function OptimizedExplorerPane({
  busy,
  projectName,
  projectPath,
  tree,
  expandedIds,
  selectedId,
  onSelect,
  onToggleExpand
}: OptimizedExplorerPaneProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(480);

  useEffect(() => {
    setScrollTop(0);

    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [tree]);

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

  const totalNodeCount = useMemo(() => countNodes(tree), [tree]);
  const visibleRows = useMemo(() => flattenVisibleRows(tree, expandedIds), [tree, expandedIds]);
  const totalHeight = visibleRows.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_COUNT);
  const endIndex = Math.min(
    visibleRows.length,
    Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN_COUNT
  );
  const virtualRows = visibleRows.slice(startIndex, endIndex);
  const topSpacerHeight = startIndex * ROW_HEIGHT;

  return (
    <div className="h-[44rem] overflow-hidden rounded-[26px] border border-border bg-[#0b1720] shadow-[0_28px_80px_rgba(3,10,18,0.32)]">
      <div className="flex items-center gap-2 border-b border-white/10 bg-[#102230] px-5 py-3.5">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <div className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        <div className="ml-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#8ab6cb]">
          Explorer
        </div>
        {busy ? (
          <div className="ml-auto text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
            Scanning
          </div>
        ) : null}
      </div>

      <div className="flex h-[calc(44rem-57px)] flex-col bg-[linear-gradient(180deg,#0f2230_0%,#0a141d_100%)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7ca6bb]">
          {projectName}
        </p>
        <div className="mt-4 space-y-2">
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            {projectName}/
          </div>
          <div className="rounded-xl border border-dashed border-white/10 px-3 py-2 text-xs text-[#88a7b6]">
            {projectPath}
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
          Scan loaded. Root items are shown first and folders stay collapsed.
        </div>
        <div className="mt-4 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9fc6d8]">
          {totalNodeCount} items
        </div>

        <div
          ref={listRef}
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
          className="mt-5 min-h-0 flex-1 overflow-y-auto"
        >
          <div style={{ height: totalHeight, position: "relative" }}>
            <div
              style={{
                transform: `translateY(${topSpacerHeight}px)`
              }}
            >
              {virtualRows.map((row) => (
                <ExplorerRow
                  key={row.node.id}
                  row={row}
                  selectedId={selectedId}
                  expandedIds={expandedIds}
                  onSelect={onSelect}
                  onToggleExpand={onToggleExpand}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
