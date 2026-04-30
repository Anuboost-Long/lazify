import { OptimizedEditorPane } from "@renderer/shared/ui/project-tree-optimized/OptimizedEditorPane";
import { OptimizedExplorerPane } from "@renderer/shared/ui/project-tree-optimized/OptimizedExplorerPane";
import {
  collectDescendantFilePaths,
  countFiles,
  findNodeById
} from "@renderer/shared/ui/project-tree-optimized/tree-utils";
import type {
  FileContentState,
  OptimizedImportedProjectTreeProps,
} from "@renderer/shared/ui/project-tree-optimized/types";
import { useEffect, useMemo, useRef, useState } from "react";

export function OptimizedImportedProjectTree({
  busy,
  onSaveTemplate,
  projectName,
  projectPath,
  tree,
}: OptimizedImportedProjectTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [includedFilePaths, setIncludedFilePaths] = useState<Set<string>>(() => new Set());
  const [templateName, setTemplateName] = useState("");
  const [fileCache, setFileCache] = useState<Record<string, FileContentState>>(
    {}
  );
  const [saveBusy, setSaveBusy] = useState(false);
  const activeRequestIdRef = useRef(0);

  useEffect(() => {
    setExpandedIds(new Set());
    setSelectedId(null);
    setActiveFilePath(null);
    setIncludedFilePaths(new Set(tree.flatMap((node) => collectDescendantFilePaths(node))));
    setTemplateName("");
    setFileCache({});
  }, [tree]);

  const totalFileCount = useMemo(() => countFiles(tree), [tree]);

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

  const handleToggleIncluded = (node: (typeof tree)[number]) => {
    const targetPaths = collectDescendantFilePaths(node);

    setIncludedFilePaths((current) => {
      const next = new Set(current);
      const shouldInclude = targetPaths.some((filePath) => !next.has(filePath));

      for (const filePath of targetPaths) {
        if (shouldInclude) {
          next.add(filePath);
        } else {
          next.delete(filePath);
        }
      }

      return next;
    });
  };

  const handleSaveTemplate = async () => {
    setSaveBusy(true);

    try {
      await onSaveTemplate(Array.from(includedFilePaths).sort(), templateName);
    } finally {
      setSaveBusy(false);
    }
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
          <p className="mt-3 text-xs leading-5 text-muted">
            Toggle files off to exclude them from the saved template snapshot.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 lg:items-end">
          <div className="rounded-full border border-emerald-300/30 bg-emerald-100/70 px-3 py-1 text-xs font-semibold text-emerald-900">
            {includedFilePaths.size} of {totalFileCount} files selected
          </div>
          <input
            value={templateName}
            onChange={(event) => setTemplateName(event.target.value)}
            placeholder="Template name or leave blank for laz-temp-001"
            className="w-full min-w-[18rem] rounded-[16px] border border-border bg-bg px-4 py-2.5 text-sm text-text outline-none transition focus:border-accent lg:w-[22rem]"
          />
          <button
            type="button"
            disabled={saveBusy || includedFilePaths.size === 0}
            onClick={() => void handleSaveTemplate()}
            className="inline-flex items-center justify-center rounded-[16px] border border-transparent bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accentHover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveBusy ? "Saving template..." : "Save as template"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <OptimizedExplorerPane
          busy={busy}
          includedFilePaths={includedFilePaths}
          projectName={projectName}
          projectPath={projectPath}
          tree={tree}
          expandedIds={expandedIds}
          selectedId={selectedId}
          onToggleIncluded={handleToggleIncluded}
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
