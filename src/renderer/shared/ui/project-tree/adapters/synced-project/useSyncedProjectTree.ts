import { useEffect, useMemo, useRef, useState } from "react";
import {
  collectDescendantFilePaths,
  findNodeById,
} from "@renderer/shared/ui/project-tree-optimized/tree-utils";
import type { EditorTab } from "@renderer/shared/ui/code/EditorTabBar";
import type {
  FileContentState,
  TreeContextMenuState,
} from "@renderer/shared/ui/project-tree-optimized/types";
import type {
  GitStatusEntry,
  ImportedProjectIndexNode,
  ImportedProjectIndexResult,
  ProjectGitStatusResult,
} from "@renderer/shared/types/lazify";
import {
  buildPath,
  renameNodeWithPaths,
  updateNodeTree
} from "@renderer/shared/ui/project-tree/tree-edits";

function buildAncestorIds(tree: ImportedProjectIndexNode[], targetId: string, trail: string[] = []): string[] {
  for (const node of tree) {
    const nextTrail = [...trail, node.id];

    if (node.id === targetId) {
      return trail;
    }

    if (node.children.length > 0) {
      const nested = buildAncestorIds(node.children, targetId, nextTrail);

      if (nested.length > 0) {
        return nested;
      }
    }
  }

  return [];
}

function findNodeByAbsolutePath(
  tree: ImportedProjectIndexNode[],
  absolutePath: string
): ImportedProjectIndexNode | null {
  const visit = (nodes: ImportedProjectIndexNode[]): ImportedProjectIndexNode | null => {
    for (const node of nodes) {
      if (node.absolutePath === absolutePath) {
        return node;
      }

      const nested = visit(node.children);

      if (nested) {
        return nested;
      }
    }

    return null;
  };

  return visit(tree);
}

// Open editor tabs and the active one, kept per project so leaving the
// workbench and returning restores the same files in the same order.
const EDITOR_TABS_STORAGE_KEY = "lazify-editor-tabs";

interface StoredEditorTabs {
  openFiles: EditorTab[];
  activeFilePath: string | null;
}

function readStoredEditorTabs(projectPath: string): StoredEditorTabs | null {
  if (typeof window === "undefined" || !projectPath) {
    return null;
  }

  try {
    const all = JSON.parse(
      globalThis.localStorage.getItem(EDITOR_TABS_STORAGE_KEY) ?? "{}"
    ) as Record<string, StoredEditorTabs>;

    return all[projectPath] ?? null;
  } catch {
    return null;
  }
}

function persistEditorTabs(projectPath: string, value: StoredEditorTabs) {
  if (typeof window === "undefined" || !projectPath) {
    return;
  }

  try {
    const all = JSON.parse(
      globalThis.localStorage.getItem(EDITOR_TABS_STORAGE_KEY) ?? "{}"
    ) as Record<string, StoredEditorTabs>;

    all[projectPath] = value;
    globalThis.localStorage.setItem(EDITOR_TABS_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // A write that fails only costs the restore; the session keeps working.
  }
}

export function useSyncedProjectTree({
  allowGitStatus = false,
  editable = false,
  project,
}: {
  allowGitStatus?: boolean;
  editable?: boolean;
  project: ImportedProjectIndexResult;
}) {
  const [activePanel, setActivePanel] = useState<"explorer" | "git">("explorer");
  const [showGitInfo, setShowGitInfo] = useState(false);
  const [editableTree, setEditableTree] = useState<ImportedProjectIndexNode[]>(project.tree);
  const [expandedIds, setExpandedIds] = useState<string[]>(() => []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  /** Files with an open tab, in tab order. */
  const [openFiles, setOpenFiles] = useState<EditorTab[]>([]);
  const [includedFilePaths, setIncludedFilePaths] = useState<Set<string>>(() => new Set());
  const [fileCache, setFileCache] = useState<Record<string, FileContentState>>({});
  const [contextMenu, setContextMenu] = useState<TreeContextMenuState | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [gitStatus, setGitStatus] = useState<ProjectGitStatusResult | null>(null);
  const [gitStatusLoading, setGitStatusLoading] = useState(false);
  /** Bumped to re-run the git status effect after the tree moves. */
  const [gitStatusNonce, setGitStatusNonce] = useState(0);
  /** The project whose tabs have been restored, gating the persist effect so
   *  it never writes the previous project's tabs under the new one's key. */
  const [hydratedProjectPath, setHydratedProjectPath] = useState<string | null>(null);
  /** Where the last go-to-definition landed, so only that file is marked. */
  const [symbolTarget, setSymbolTarget] = useState<{
    filePath: string;
    line: number;
  } | null>(null);
  const activeRequestIdRef = useRef(0);

  useEffect(() => {
    setActivePanel("explorer");
    setShowGitInfo(false);
    setEditableTree(project.tree);
    setExpandedIds([]);
    setSelectedId(null);

    // Restore the tabs this project last had open, dropping any whose file has
    // since left the tree, and keeping their saved order.
    const stored = readStoredEditorTabs(project.projectPath);
    const restoredTabs = (stored?.openFiles ?? []).filter((tab) =>
      findNodeByAbsolutePath(project.tree, tab.filePath)
    );
    const restoredActive =
      stored?.activeFilePath &&
      restoredTabs.some((tab) => tab.path === stored.activeFilePath)
        ? stored.activeFilePath
        : restoredTabs[0]?.path ?? null;
    setOpenFiles(restoredTabs);
    setActiveFilePath(restoredActive);
    setHydratedProjectPath(project.projectPath);

    setIncludedFilePaths(new Set(project.tree.flatMap((node) => collectDescendantFilePaths(node))));
    setFileCache({});
    setContextMenu(null);
    setRenamingId(null);
    setRenameValue("");
    setGitStatus(null);
    setGitStatusLoading(false);
    setSymbolTarget(null);
  }, [project]);

  // Once this project's tabs are hydrated, mirror every change back to storage.
  useEffect(() => {
    if (hydratedProjectPath !== project.projectPath) {
      return;
    }

    persistEditorTabs(project.projectPath, { openFiles, activeFilePath });
  }, [openFiles, activeFilePath, hydratedProjectPath, project.projectPath]);

  useEffect(() => {
    if (!editable) {
      setContextMenu(null);
      setRenamingId(null);
      setRenameValue("");
    }
  }, [editable]);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    globalThis.addEventListener("click", closeMenu);
    return () => globalThis.removeEventListener("click", closeMenu);
  }, []);

  useEffect(() => {
    if (!allowGitStatus) {
      return;
    }

    let cancelled = false;

    const loadGitStatus = async () => {
      try {
        setGitStatusLoading(true);
        const result = await globalThis.lazify.getProjectGitStatus(project.projectPath);

        if (!cancelled) {
          setGitStatus(result);
        }
      } finally {
        if (!cancelled) {
          setGitStatusLoading(false);
        }
      }
    };

    void loadGitStatus();

    return () => {
      cancelled = true;
    };
  }, [allowGitStatus, project.projectPath, gitStatusNonce]);

  const selectedNode = useMemo(
    () => (selectedId ? findNodeById(editableTree, selectedId) : null),
    [editableTree, selectedId]
  );

  const activeTab = useMemo(
    () => openFiles.find((tab) => tab.path === activeFilePath) ?? null,
    [openFiles, activeFilePath]
  );

  const activeFileNode = useMemo(
    () => (activeTab ? findNodeByAbsolutePath(editableTree, activeTab.filePath) : null),
    [editableTree, activeTab]
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
        content: current[activeFilePath]?.content ?? ""
      }
    }));

    const load =
      activeTab?.kind === "diff"
        ? // Full-file context: the changes read in place inside the whole
          // source rather than as detached hunks.
          globalThis.lazify.getFileDiff(project.projectPath, activeTab.filePath, true)
        : globalThis.lazify.readImportedProjectFile(activeTab?.filePath ?? activeFilePath);

    void load
      .then((content) => {
        if (activeRequestIdRef.current !== requestId) {
          return;
        }

        setFileCache((current) => ({
          ...current,
          [activeFilePath]: {
            status: "loaded",
            content
          }
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
            content: error instanceof Error ? error.message : "Unable to load file preview."
          }
        }));
      });
  }, [activeFilePath, activeTab, project.projectPath]);

  const handleSelectNode = (node: ImportedProjectIndexNode) => {
    setSelectedId(node.id);

    // Selecting a folder only moves the tree highlight. The editor keeps
    // whatever file is open — closing it would throw away the user's place
    // just for expanding a directory.
    if (node.type !== "file") return;

    setOpenFiles((current) =>
      current.some((tab) => tab.path === node.absolutePath)
        ? current
        : [
            ...current,
            {
              path: node.absolutePath,
              name: node.name,
              kind: "file" as const,
              filePath: node.absolutePath
            }
          ]
    );
    setActiveFilePath(node.absolutePath);
  };

  /**
   * Opens a file's working-tree diff as its own tab, so the change and the
   * file itself can be open side by side rather than replacing each other.
   */
  const handleOpenDiff = (entry: GitStatusEntry) => {
    const tabPath = `diff:${entry.absolutePath}`;
    const name = entry.path.slice(entry.path.lastIndexOf("/") + 1);

    setOpenFiles((current) =>
      current.some((tab) => tab.path === tabPath)
        ? current
        : [
            ...current,
            { path: tabPath, name, kind: "diff" as const, filePath: entry.absolutePath }
          ]
    );
    setActiveFilePath(tabPath);

    const node = findNodeByAbsolutePath(editableTree, entry.absolutePath);
    if (node) setSelectedId(node.id);
  };

  const handleSelectOpenFile = (path: string) => {
    setActiveFilePath(path);

    const tab = openFiles.find((candidate) => candidate.path === path);
    const node = tab ? findNodeByAbsolutePath(editableTree, tab.filePath) : null;
    if (node) setSelectedId(node.id);
  };

  /** Closing the active tab falls back to its left neighbour, then its right. */
  const handleCloseOpenFile = (path: string) => {
    setOpenFiles((current) => {
      const index = current.findIndex((tab) => tab.path === path);
      if (index === -1) return current;

      const next = current.filter((tab) => tab.path !== path);

      if (path === activeFilePath) {
        const fallback = next[index - 1] ?? next[index] ?? null;
        setActiveFilePath(fallback?.path ?? null);
        if (fallback) {
          const node = findNodeByAbsolutePath(editableTree, fallback.filePath);
          if (node) setSelectedId(node.id);
        }
      }

      return next;
    });
  };

  /**
   * Empties the editor. The tree highlight stays where it is — the selection
   * is about the explorer, and closing tabs is no reason to lose your place.
   */
  const handleCloseAllOpenFiles = () => {
    setOpenFiles([]);
    setActiveFilePath(null);
  };

  const handleReorderOpenFiles = (fromPath: string, toPath: string) => {
    setOpenFiles((current) => {
      const from = current.findIndex((tab) => tab.path === fromPath);
      const to = current.findIndex((tab) => tab.path === toPath);
      if (from === -1 || to === -1 || from === to) return current;

      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);

      return next;
    });
  };

  const handleOpenGitEntry = (entry: GitStatusEntry) => {
    const node = findNodeByAbsolutePath(editableTree, entry.absolutePath);

    if (!node) {
      return;
    }

    const ancestorIds = buildAncestorIds(editableTree, node.id);

    setExpandedIds((current) => {
      const toAdd = ancestorIds.filter((id) => !current.includes(id));
      return toAdd.length > 0 ? [...current, ...toAdd] : current;
    });
    setActivePanel("explorer");
    handleSelectNode(node);
  };

  /**
   * Go to definition, the workbench way: the file opens as a tab in this
   * editor, the explorer expands to it, and the declaration is marked. The
   * navigation never leaves the page — that is the whole point of doing it
   * here rather than handing the path to something else.
   *
   * A name that resolves to nothing, or to a file outside the indexed tree, is
   * a no-op: a click on an ordinary word must not disturb what is open.
   */
  const handleOpenSymbol = async (symbol: string) => {
    const hit = await globalThis.lazify
      .findSymbolDefinition(project.projectPath, symbol)
      .catch(() => null);

    if (!hit) return;

    const node = findNodeByAbsolutePath(editableTree, hit.absolutePath);
    if (!node) return;

    const ancestorIds = buildAncestorIds(editableTree, node.id);

    setExpandedIds((current) => {
      const toAdd = ancestorIds.filter((id) => !current.includes(id));
      return toAdd.length > 0 ? [...current, ...toAdd] : current;
    });
    setActivePanel("explorer");
    handleSelectNode(node);
    setSymbolTarget({ filePath: node.absolutePath, line: hit.line });
  };

  const handleCreateEntry = (type: "file" | "folder") => {
    const parentNode = contextMenu?.node?.type === "folder" ? contextMenu.node : null;
    const seed = Date.now();
    const nextName = type === "file" ? `untitled-${seed}.ts` : `new-folder-${seed}`;
    const nextNode: ImportedProjectIndexNode = {
      id: `workspace-${seed}-${Math.random().toString(16).slice(2, 8)}`,
      name: nextName,
      type,
      relativePath: buildPath(parentNode?.relativePath ?? "", nextName),
      absolutePath: buildPath(parentNode?.absolutePath ?? project.projectPath, nextName),
      children: []
    };

    setEditableTree((current) => {
      if (!parentNode) {
        return [...current, nextNode];
      }

      return updateNodeTree(current, parentNode.id, (node) => ({
        ...node,
        children: [...node.children, nextNode]
      }));
    });

    if (parentNode) {
      setExpandedIds((current) =>
        current.includes(parentNode.id) ? current : [...current, parentNode.id]
      );
    }

    if (type === "file") {
      setFileCache((current) => ({
        ...current,
        [nextNode.absolutePath]: {
          status: "loaded",
          content: ""
        }
      }));
      setActiveFilePath(nextNode.absolutePath);
    } else {
      setActiveFilePath(null);
    }

    setSelectedId(nextNode.id);
    setRenamingId(nextNode.id);
    setRenameValue(nextName);
    setContextMenu(null);
  };

  const handleDeleteNode = () => {
    const targetNode = contextMenu?.node;

    if (!targetNode) {
      return;
    }

    setEditableTree((current) => updateNodeTree(current, targetNode.id, () => null));
    setIncludedFilePaths((current) => {
      const next = new Set(current);
      collectDescendantFilePaths(targetNode).forEach((filePath) => next.delete(filePath));
      return next;
    });

    if (selectedId === targetNode.id) {
      setSelectedId(null);
      setActiveFilePath(null);
    }

    setContextMenu(null);
  };

  const handleStartRename = () => {
    const targetNode = contextMenu?.node;

    if (!targetNode) {
      return;
    }

    setSelectedId(targetNode.id);
    setRenamingId(targetNode.id);
    setRenameValue(targetNode.name);
    setContextMenu(null);
  };

  const handleCommitRename = () => {
    if (!renamingId) {
      return;
    }

    const nextName = renameValue.trim();

    if (!nextName) {
      setRenamingId(null);
      setRenameValue("");
      return;
    }

    setEditableTree((current) =>
      updateNodeTree(current, renamingId, (node) => renameNodeWithPaths(node, nextName))
    );
    setRenamingId(null);
    setRenameValue("");
  };

  const handleToggleExpand = (nodeId: string) => {
    setExpandedIds((current) =>
      current.includes(nodeId)
        ? current.filter((id) => id !== nodeId)
        : [...current, nodeId]
    );
  };

  return {
    activeFileNode,
    activeFilePath,
    activeTab,
    activePanel,
    handleCloseAllOpenFiles,
    handleCloseOpenFile,
    handleReorderOpenFiles,
    handleSelectOpenFile,
    openFiles,
    contextMenu,
    editableTree,
    expandedIds,
    gitStatus,
    gitStatusLoading,
    refreshGitStatus: () => setGitStatusNonce((current) => current + 1),
    handleCommitRename,
    handleCreateEntry,
    handleDeleteNode,
    handleOpenDiff,
    handleOpenGitEntry,
    handleOpenSymbol,
    /** Line to reveal, but only while its own file is the one on screen. */
    focusLine:
      symbolTarget && activeTab?.kind === "file" && activeTab.filePath === symbolTarget.filePath
        ? symbolTarget.line
        : null,
    handleSelectNode,
    handleStartRename,
    handleToggleExpand,
    renameValue,
    renamingId,
    selectedFileState,
    selectedId,
    selectedNode,
    setActivePanel,
    setContextMenu,
    setExpandedIds,
    setRenameValue,
    setRenamingId,
    setShowGitInfo,
    showGitInfo,
  };
}
