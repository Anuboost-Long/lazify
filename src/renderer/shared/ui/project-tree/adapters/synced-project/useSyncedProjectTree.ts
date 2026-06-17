import { useEffect, useMemo, useRef, useState } from "react";
import {
  collectDescendantFilePaths,
  findNodeById,
} from "@renderer/shared/ui/project-tree-optimized/tree-utils";
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

function updateNodeTree(
  nodes: ImportedProjectIndexNode[],
  targetId: string,
  updater: (node: ImportedProjectIndexNode) => ImportedProjectIndexNode | null
): ImportedProjectIndexNode[] {
  return nodes.flatMap((node) => {
    if (node.id === targetId) {
      const updated = updater(node);
      return updated ? [updated] : [];
    }

    if (node.children.length === 0) {
      return [node];
    }

    return [{
      ...node,
      children: updateNodeTree(node.children, targetId, updater)
    }];
  });
}

function buildPath(parentPath: string, name: string) {
  return parentPath ? `${parentPath}/${name}` : name;
}

function renameNodeWithPaths(node: ImportedProjectIndexNode, nextName: string): ImportedProjectIndexNode {
  const previousRelativePath = node.relativePath;
  const previousAbsolutePath = node.absolutePath;
  const relativeSegments = previousRelativePath.split("/");
  const absoluteSegments = previousAbsolutePath.split("/");
  relativeSegments[relativeSegments.length - 1] = nextName;
  absoluteSegments[absoluteSegments.length - 1] = nextName;
  const nextRelativePath = relativeSegments.join("/");
  const nextAbsolutePath = absoluteSegments.join("/");

  const rewriteChildren = (children: ImportedProjectIndexNode[]): ImportedProjectIndexNode[] =>
    children.map((child) => ({
      ...child,
      relativePath: child.relativePath.replace(previousRelativePath, nextRelativePath),
      absolutePath: child.absolutePath.replace(previousAbsolutePath, nextAbsolutePath),
      children: rewriteChildren(child.children)
    }));

  return {
    ...node,
    name: nextName,
    relativePath: nextRelativePath,
    absolutePath: nextAbsolutePath,
    children: rewriteChildren(node.children)
  };
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
  const [includedFilePaths, setIncludedFilePaths] = useState<Set<string>>(() => new Set());
  const [fileCache, setFileCache] = useState<Record<string, FileContentState>>({});
  const [contextMenu, setContextMenu] = useState<TreeContextMenuState | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [gitStatus, setGitStatus] = useState<ProjectGitStatusResult | null>(null);
  const [gitStatusLoading, setGitStatusLoading] = useState(false);
  const activeRequestIdRef = useRef(0);

  useEffect(() => {
    setActivePanel("explorer");
    setShowGitInfo(false);
    setEditableTree(project.tree);
    setExpandedIds([]);
    setSelectedId(null);
    setActiveFilePath(null);
    setIncludedFilePaths(new Set(project.tree.flatMap((node) => collectDescendantFilePaths(node))));
    setFileCache({});
    setContextMenu(null);
    setRenamingId(null);
    setRenameValue("");
    setGitStatus(null);
    setGitStatusLoading(false);
  }, [project]);

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
  }, [allowGitStatus, project.projectPath]);

  const selectedNode = useMemo(
    () => (selectedId ? findNodeById(editableTree, selectedId) : null),
    [editableTree, selectedId]
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

    void globalThis.lazify.readImportedProjectFile(activeFilePath)
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
  }, [activeFilePath]);

  const handleSelectNode = (node: ImportedProjectIndexNode) => {
    setSelectedId(node.id);

    if (node.type === "file") {
      setActiveFilePath(node.absolutePath);
    } else {
      setActiveFilePath(null);
    }
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
    activeFilePath,
    activePanel,
    contextMenu,
    editableTree,
    expandedIds,
    gitStatus,
    gitStatusLoading,
    handleCommitRename,
    handleCreateEntry,
    handleDeleteNode,
    handleOpenGitEntry,
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
