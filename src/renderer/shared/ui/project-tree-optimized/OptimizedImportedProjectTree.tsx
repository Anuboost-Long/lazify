import { OptimizedEditorPane } from "@renderer/shared/ui/project-tree-optimized/OptimizedEditorPane";
import { OptimizedExplorerPane } from "@renderer/shared/ui/project-tree-optimized/OptimizedExplorerPane";
import { findNodeById } from "@renderer/shared/ui/project-tree-optimized/tree-utils";
import type {
  FileContentState,
  OptimizedImportedProjectTreeProps,
} from "@renderer/shared/ui/project-tree-optimized/types";
import { useEffect, useMemo, useRef, useState } from "react";

export function OptimizedImportedProjectTree({
  busy,
  projectName,
  projectPath,
  tree,
}: OptimizedImportedProjectTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [fileCache, setFileCache] = useState<Record<string, FileContentState>>(
    {}
  );
  const activeRequestIdRef = useRef(0);

  useEffect(() => {
    setExpandedIds(new Set());
    setSelectedId(null);
    setActiveFilePath(null);
    setFileCache({});
  }, [tree]);

  const selectedNode = useMemo(
    () => (selectedId ? findNodeById(tree, selectedId) : null),
    [selectedId, tree]
  );

  const selectedFileState = activeFilePath
    ? fileCache[activeFilePath] ?? { status: "idle", content: "" }
    : null;

  useEffect(() => {
    if (!activeFilePath) {
      return;
    }

    const currentEntry = fileCache[activeFilePath];

    if (currentEntry?.status === "loaded") {
      return;
    }

    const requestId = activeRequestIdRef.current + 1;
    activeRequestIdRef.current = requestId;

    setFileCache((current) => ({
      ...current,
      [activeFilePath]: {
        status: "loading",
        content: current[activeFilePath]?.content ?? "",
      },
    }));

    void window.lazify
      .readImportedProjectFile(activeFilePath)
      .then((content) => {
        if (activeRequestIdRef.current !== requestId) {
          return;
        }

        setFileCache((current) => ({
          ...current,
          [activeFilePath]: {
            status: "loaded",
            content,
          },
        }));
      })
      .catch((error) => {
        if (activeRequestIdRef.current !== requestId) {
          return;
        }

        setFileCache((current) => ({
          ...current,
          [activeFilePath]: {
            status: "error",
            content:
              error instanceof Error
                ? error.message
                : "Unable to load file preview.",
          },
        }));
      });
  }, [activeFilePath]);

  const handleSelectNode = (node: (typeof tree)[number]) => {
    setSelectedId(node.id);

    if (node.type === "file") {
      setActiveFilePath(node.absolutePath);
    } else {
      setActiveFilePath(null);
    }
  };

  const handleToggleExpand = (nodeId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);

      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }

      return next;
    });
  };

  return (
    <section className="overflow-hidden rounded-[30px] border border-border bg-soft p-6 shadow-panel">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Imported structure
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-text">
            Optimized explorer for {projectName}
          </h3>
          <p className="mt-3 text-sm leading-6 text-muted">
            This viewer uses metadata-only scanning, lazy file loading, and
            virtualized rows so large projects stay responsive.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <OptimizedExplorerPane
          busy={busy}
          projectName={projectName}
          projectPath={projectPath}
          tree={tree}
          expandedIds={expandedIds}
          selectedId={selectedId}
          onSelect={handleSelectNode}
          onToggleExpand={handleToggleExpand}
        />

        <OptimizedEditorPane
          selectedNode={selectedNode}
          selectedFileState={selectedFileState}
        />
      </div>
    </section>
  );
}
