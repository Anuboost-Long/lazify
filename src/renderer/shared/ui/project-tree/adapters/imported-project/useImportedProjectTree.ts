import type { ImportedProjectIndexNode } from "@renderer/shared/types/lazify";
import {
  collectDescendantFilePaths,
  countFiles,
  findNodeById,
  hasIncludedFiles,
} from "@renderer/shared/ui/project-tree-optimized/tree-utils";
import type {
  FileContentState,
  OptimizedImportedProjectTreeProps,
  TreeContextMenuState,
} from "@renderer/shared/ui/project-tree-optimized/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildPath,
  renameNodeWithPaths,
  updateNodeTree
} from "@renderer/shared/ui/project-tree/tree-edits";

export function useImportedProjectTree({
  initialConfirmedStack,
  onSaveTemplate,
  projectPath,
  tree,
}: Pick<
  OptimizedImportedProjectTreeProps,
  "initialConfirmedStack" | "onSaveTemplate" | "projectPath" | "tree"
>) {
  const [editableTree, setEditableTree] =
    useState<ImportedProjectIndexNode[]>(tree);
  const [expandedIds, setExpandedIds] = useState<string[]>(() => []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [includedFilePaths, setIncludedFilePaths] = useState<Set<string>>(
    () => new Set(),
  );
  const [confirmedStack, setConfirmedStack] = useState(initialConfirmedStack);
  const [templateName, setTemplateName] = useState("");
  const [fileCache, setFileCache] = useState<Record<string, FileContentState>>(
    {},
  );
  const [contextMenu, setContextMenu] = useState<TreeContextMenuState | null>(
    null,
  );
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const activeRequestIdRef = useRef(0);

  useEffect(() => {
    setEditableTree(tree);
    setExpandedIds([]);
    setSelectedId(null);
    setActiveFilePath(null);
    setIncludedFilePaths(
      new Set(tree.flatMap((node) => collectDescendantFilePaths(node))),
    );
    setConfirmedStack(initialConfirmedStack);
    setTemplateName("");
    setFileCache({});
    setContextMenu(null);
    setRenamingId(null);
    setRenameValue("");
  }, [initialConfirmedStack, tree]);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    globalThis.addEventListener("click", closeMenu);
    return () => globalThis.removeEventListener("click", closeMenu);
  }, []);

  const totalFileCount = useMemo(
    () => countFiles(editableTree),
    [editableTree],
  );
  const selectedNode = useMemo(
    () => (selectedId ? findNodeById(editableTree, selectedId) : null),
    [selectedId, editableTree],
  );
  const selectedFileState = activeFilePath
    ? (fileCache[activeFilePath] ?? { status: "idle", content: "" })
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

    void globalThis.lazify
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

  const handleSelectNode = (node: ImportedProjectIndexNode) => {
    setSelectedId(node.id);

    if (node.type === "file") {
      setActiveFilePath(node.absolutePath);
    } else {
      setActiveFilePath(null);
    }
  };

  const handleToggleExpand = (nodeId: string) => {
    setExpandedIds((current) =>
      current.includes(nodeId)
        ? current.filter((id) => id !== nodeId)
        : [...current, nodeId],
    );
  };

  const handleToggleIncluded = (node: ImportedProjectIndexNode) => {
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

  const handleIsChecked = useCallback(
    (nodeId: string) => {
      const node = findNodeById(editableTree, nodeId);
      return node ? hasIncludedFiles(node, includedFilePaths) : false;
    },
    [editableTree, includedFilePaths],
  );

  const handleToggleChecked = useCallback(
    (nodeId: string) => {
      const node = findNodeById(editableTree, nodeId);

      if (node) {
        handleToggleIncluded(node);
      }
    },
    [editableTree],
  );

  const handleCreateEntry = (type: "file" | "folder") => {
    const parentNode =
      contextMenu?.node?.type === "folder" ? contextMenu.node : null;
    const seed = Date.now();
    const nextName =
      type === "file" ? `untitled-${seed}.ts` : `new-folder-${seed}`;
    const nextNode: ImportedProjectIndexNode = {
      id: `virtual-${seed}-${Math.random().toString(16).slice(2, 8)}`,
      name: nextName,
      type,
      relativePath: buildPath(parentNode?.relativePath ?? "", nextName),
      absolutePath: buildPath(
        parentNode?.absolutePath ?? projectPath,
        nextName,
      ),
      children: [],
    };

    setEditableTree((current) => {
      if (!parentNode) {
        return [...current, nextNode];
      }

      return updateNodeTree(current, parentNode.id, (node) => ({
        ...node,
        children: [...node.children, nextNode],
      }));
    });

    if (parentNode) {
      setExpandedIds((current) =>
        current.includes(parentNode.id) ? current : [...current, parentNode.id],
      );
    }

    if (type === "file") {
      setFileCache((current) => ({
        ...current,
        [nextNode.absolutePath]: {
          status: "loaded",
          content: "",
        },
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

    setEditableTree((current) =>
      updateNodeTree(current, targetNode.id, () => null),
    );
    setIncludedFilePaths((current) => {
      const next = new Set(current);
      collectDescendantFilePaths(targetNode).forEach((filePath) =>
        next.delete(filePath),
      );
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
      updateNodeTree(current, renamingId, (node) =>
        renameNodeWithPaths(node, nextName),
      ),
    );
    setRenamingId(null);
    setRenameValue("");
  };

  const handleSaveTemplate = async () => {
    setSaveBusy(true);

    try {
      await onSaveTemplate(
        Array.from(includedFilePaths).sort((a, b) => a.localeCompare(b)),
        templateName,
        confirmedStack ?? "",
      );
    } finally {
      setSaveBusy(false);
    }
  };

  return {
    confirmedStack,
    contextMenu,
    editableTree,
    expandedIds,
    handleCommitRename,
    handleCreateEntry,
    handleDeleteNode,
    handleIsChecked,
    handleSaveTemplate,
    handleSelectNode,
    handleStartRename,
    handleToggleChecked,
    handleToggleExpand,
    includedFilePaths,
    renameValue,
    renamingId,
    saveBusy,
    selectedFileState,
    selectedId,
    selectedNode,
    setConfirmedStack,
    setContextMenu,
    setExpandedIds,
    setRenameValue,
    setRenamingId,
    setTemplateName,
    templateName,
    totalFileCount,
  };
}
