import { useEffect, useMemo, useRef, useState } from "react";
import type { EditorTab } from "@renderer/shared/ui/code/EditorTabBar";
import {
  addChildNode,
  collectFolderIds,
  createNode,
  findContainingFolderId,
  findFirstFileId,
  findNode,
  getNodePath,
  mergeTrees,
  removeFromTree,
  slug,
  updateTree,
} from "@renderer/shared/ui/project-tree/tree-utils";
import type {
  ProjectTreeEditorPanelProps,
  TreeNode,
} from "@renderer/shared/ui/project-tree/types";

export function useLocalProjectTree({
  initialTree,
  onTreeChange,
  replaceTreeOnInitialChange = false,
  selectedStructurePaths,
  templateId,
}: Pick<
  ProjectTreeEditorPanelProps,
  | "initialTree"
  | "onTreeChange"
  | "replaceTreeOnInitialChange"
  | "selectedStructurePaths"
  | "templateId"
>) {
  // Every tree now comes from disk — a starter clone, a CLI's output, or an
  // imported template. Nothing is synthesized from constants any more.
  const resolvedInitialTree = useMemo(() => initialTree ?? [], [initialTree]);
  const [tree, setTree] = useState<TreeNode[]>(resolvedInitialTree);
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    findFirstFileId(resolvedInitialTree)
  );
  const [activeFileId, setActiveFileId] = useState<string | null>(() =>
    findFirstFileId(resolvedInitialTree)
  );
  const [openFileIds, setOpenFileIds] = useState<string[]>(() => {
    const firstFileId = findFirstFileId(resolvedInitialTree);
    return firstFileId ? [firstFileId] : [];
  });
  const [expandedIds, setExpandedIds] = useState<string[]>(() =>
    collectFolderIds(resolvedInitialTree)
  );
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);
  const lastPublishedTreeRef = useRef<TreeNode[] | null>(null);

  useEffect(() => {
    const incomingTree = initialTree ?? null;

    if (incomingTree && incomingTree === lastPublishedTreeRef.current) {
      return;
    }

    if (replaceTreeOnInitialChange) {
      const firstFileId = findFirstFileId(resolvedInitialTree);
      setTree(resolvedInitialTree);
      setExpandedIds(collectFolderIds(resolvedInitialTree));
      setSelectedId(firstFileId);
      setActiveFileId(firstFileId);
      setOpenFileIds(firstFileId ? [firstFileId] : []);
      return;
    }

    setTree((current) => mergeTrees(resolvedInitialTree, current));
    setExpandedIds((current) =>
      Array.from(
        new Set([...current, ...collectFolderIds(resolvedInitialTree)])
      )
    );
    const firstFileId = findFirstFileId(resolvedInitialTree);
    setSelectedId((current) => current ?? firstFileId);
    setActiveFileId((current) => current ?? firstFileId);
    setOpenFileIds((current) =>
      current.length > 0 || !firstFileId ? current : [firstFileId]
    );
  }, [
    initialTree,
    replaceTreeOnInitialChange,
    resolvedInitialTree,
  ]);

  useEffect(() => {
    lastPublishedTreeRef.current = tree;
    onTreeChange(tree);
  }, [onTreeChange, tree]);

  const selectedNode = selectedId ? findNode(tree, selectedId) : null;
  const activeFileNode = activeFileId ? findNode(tree, activeFileId) : null;
  const activeFilePath = activeFileId ? getNodePath(tree, activeFileId) : null;
  const openFiles = openFileIds.flatMap((id): EditorTab[] => {
    const node = findNode(tree, id);
    const path = getNodePath(tree, id);

    return node?.type === "file" && path
      ? [{ path, name: node.name, kind: "file", filePath: node.id }]
      : [];
  });
  const activeTab =
    openFiles.find((tab) => tab.filePath === activeFileId) ?? null;
  // Locking came from the blueprint's folder list. What may not be removed is
  // now the starter's `required`, applied as `locked` when the tree is built
  // and enforced again in the main process.
  const lockedFolderNames = new Set<string>();
  const selectedContextNode = contextMenu
    ? findNode(tree, contextMenu.nodeId)
    : null;

  const handleToggleExpand = (id: string) => {
    setExpandedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const handleCommitRename = () => {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }

    const targetNode = findNode(tree, renamingId);

    if (!targetNode) {
      setRenamingId(null);
      return;
    }

    setTree((current) =>
      updateTree(current, renamingId, (node) => ({
        ...node,
        name: renameValue.trim(),
      }))
    );
    setRenamingId(null);
  };

  const handleDeleteNode = (nodeId: string) => {
    const node = findNode(tree, nodeId);

    if (!node) {
      return;
    }

    const nextTree = removeFromTree(tree, nodeId);
    const removedIds = new Set<string>();
    const collectIds = (target: TreeNode) => {
      removedIds.add(target.id);
      target.children.forEach(collectIds);
    };
    collectIds(node);

    setTree(nextTree);
    setSelectedId(findFirstFileId(nextTree));
    setOpenFileIds((current) => {
      const activeIndex = current.indexOf(activeFileId ?? "");
      const next = current.filter((id) => !removedIds.has(id));

      if (activeFileId && removedIds.has(activeFileId)) {
        setActiveFileId(next[activeIndex - 1] ?? next[activeIndex] ?? null);
      }

      return next;
    });
    setContextMenu(null);
  };

  const handleCreateEntry = (type: "file" | "folder") => {
    const parentId = selectedId
      ? findContainingFolderId(tree, selectedId)
      : null;
    const baseName = type === "folder" ? "new-folder" : "new-file.ts";
    const newNode = createNode(
      baseName,
      type,
      "custom",
      false,
      [],
      `custom-${type}-${slug(baseName)}-${Date.now()}`,
      type === "file" ? "" : undefined
    );

    setTree((current) => addChildNode(current, parentId, newNode));

    if (parentId) {
      setExpandedIds((current) =>
        current.includes(parentId) ? current : [...current, parentId]
      );
    }

    setSelectedId(newNode.id);
    if (type === "file") {
      setOpenFileIds((current) => [...current, newNode.id]);
      setActiveFileId(newNode.id);
    }
    setRenamingId(newNode.id);
    setRenameValue(baseName);
    setContextMenu(null);
  };

  const handleContentChange = (value: string) => {
    if (!activeFileNode || activeFileNode.type !== "file") {
      return;
    }

    setTree((current) =>
      updateTree(current, activeFileNode.id, (node) => ({
        ...node,
        content: value,
      }))
    );
  };

  const handleSelectNode = (nodeId: string) => {
    const node = findNode(tree, nodeId);
    setSelectedId(nodeId);

    if (node?.type !== "file") {
      return;
    }

    setOpenFileIds((current) =>
      current.includes(node.id) ? current : [...current, node.id]
    );
    setActiveFileId(node.id);
  };

  const handleSelectOpenFile = (path: string) => {
    const tab = openFiles.find((candidate) => candidate.path === path);

    if (tab) {
      setActiveFileId(tab.filePath);
      setSelectedId(tab.filePath);
    }
  };

  const handleCloseOpenFile = (path: string) => {
    const closingTab = openFiles.find((tab) => tab.path === path);

    if (!closingTab) {
      return;
    }

    setOpenFileIds((current) => {
      const index = current.indexOf(closingTab.filePath);
      const next = current.filter((id) => id !== closingTab.filePath);

      if (closingTab.filePath === activeFileId) {
        const fallbackId = next[index - 1] ?? next[index] ?? null;
        setActiveFileId(fallbackId);
        if (fallbackId) setSelectedId(fallbackId);
      }

      return next;
    });
  };

  const handleCloseAllOpenFiles = () => {
    setOpenFileIds([]);
    setActiveFileId(null);
  };

  const handleReorderOpenFiles = (fromPath: string, toPath: string) => {
    const fromId = openFiles.find((tab) => tab.path === fromPath)?.filePath;
    const toId = openFiles.find((tab) => tab.path === toPath)?.filePath;

    if (!fromId || !toId) {
      return;
    }

    setOpenFileIds((current) => {
      const from = current.indexOf(fromId);
      const to = current.indexOf(toId);
      if (from === -1 || to === -1 || from === to) return current;

      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleOpenContextMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
    nodeId: string
  ) => {
    event.preventDefault();
    setSelectedId(nodeId);

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      nodeId,
    });
  };

  const handleStartRename = (nodeId: string) => {
    const node = findNode(tree, nodeId);

    if (!node) {
      return;
    }

    setRenamingId(node.id);
    setRenameValue(node.name);
    setContextMenu(null);
  };

  return {
    activeFileNode,
    activeFilePath,
    activeTab,
    contextMenu,
    expandedIds,
    handleCloseAllOpenFiles,
    handleCloseOpenFile,
    handleCommitRename,
    handleContentChange,
    handleCreateEntry,
    handleDeleteNode,
    handleOpenContextMenu,
    handleReorderOpenFiles,
    handleSelectNode,
    handleSelectOpenFile,
    handleStartRename,
    handleToggleExpand,
    lockedFolderNames,
    openFiles,
    renameValue,
    renamingId,
    selectedContextNode,
    selectedId,
    selectedNode,
    setContextMenu,
    setExpandedIds,
    setRenamingId,
    setRenameValue,
    tree,
  };
}
