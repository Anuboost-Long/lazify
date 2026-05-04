import { useEffect, useMemo, useRef, useState } from "react";
import { templateBlueprints } from "@renderer/shared/ui/project-tree/constants/template-blueprints";
import {
  addChildNode,
  buildBaselineTree,
  collectFolderIds,
  createNode,
  findContainingFolderId,
  findFirstFileId,
  findNode,
  getDefaultFileContent,
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
  useScaffoldBaseline = true,
}: Pick<
  ProjectTreeEditorPanelProps,
  | "initialTree"
  | "onTreeChange"
  | "replaceTreeOnInitialChange"
  | "selectedStructurePaths"
  | "templateId"
  | "useScaffoldBaseline"
>) {
  const baselineTree = useMemo(
    () =>
      useScaffoldBaseline
        ? buildBaselineTree(templateId, selectedStructurePaths)
        : [],
    [selectedStructurePaths, templateId, useScaffoldBaseline]
  );
  const resolvedInitialTree = useMemo(
    () =>
      useScaffoldBaseline
        ? initialTree
          ? mergeTrees(baselineTree, initialTree)
          : baselineTree
        : initialTree ?? [],
    [baselineTree, initialTree, useScaffoldBaseline]
  );
  const [tree, setTree] = useState<TreeNode[]>(resolvedInitialTree);
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    findFirstFileId(resolvedInitialTree)
  );
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

    if (!useScaffoldBaseline && replaceTreeOnInitialChange) {
      setTree(resolvedInitialTree);
      setExpandedIds(collectFolderIds(resolvedInitialTree));
      setSelectedId(findFirstFileId(resolvedInitialTree));
      return;
    }

    setTree((current) => mergeTrees(resolvedInitialTree, current));
    setExpandedIds((current) =>
      Array.from(
        new Set([...current, ...collectFolderIds(resolvedInitialTree)])
      )
    );
    setSelectedId((current) => current ?? findFirstFileId(resolvedInitialTree));
  }, [
    initialTree,
    replaceTreeOnInitialChange,
    resolvedInitialTree,
    selectedStructurePaths,
    templateId,
    useScaffoldBaseline,
  ]);

  useEffect(() => {
    lastPublishedTreeRef.current = tree;
    onTreeChange(tree);
  }, [onTreeChange, tree]);

  const selectedNode = selectedId ? findNode(tree, selectedId) : null;
  const selectedPath = selectedId ? getNodePath(tree, selectedId) : null;
  const lockedFolderNames = new Set(
    (templateBlueprints[templateId]?.folders ?? []).map((folder) => folder.name)
  );
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
    setTree(nextTree);
    setSelectedId(findFirstFileId(nextTree));
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
      type === "file" ? getDefaultFileContent(baseName, templateId) : undefined
    );

    setTree((current) => addChildNode(current, parentId, newNode));

    if (parentId) {
      setExpandedIds((current) =>
        current.includes(parentId) ? current : [...current, parentId]
      );
    }

    setSelectedId(newNode.id);
    setRenamingId(newNode.id);
    setRenameValue(baseName);
    setContextMenu(null);
  };

  const handleContentChange = (value: string) => {
    if (!selectedNode || selectedNode.type !== "file") {
      return;
    }

    setTree((current) =>
      updateTree(current, selectedNode.id, (node) => ({
        ...node,
        content: value,
      }))
    );
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
    contextMenu,
    expandedIds,
    handleCommitRename,
    handleContentChange,
    handleCreateEntry,
    handleDeleteNode,
    handleOpenContextMenu,
    handleStartRename,
    handleToggleExpand,
    lockedFolderNames,
    renameValue,
    renamingId,
    selectedContextNode,
    selectedId,
    selectedNode,
    selectedPath,
    setContextMenu,
    setExpandedIds,
    setRenamingId,
    setRenameValue,
    setSelectedId,
    tree,
  };
}
