import { ContextMenu } from "@renderer/shared/ui/project-tree/ContextMenu";
import { EditorPane } from "@renderer/shared/ui/project-tree/EditorPane";
import { ExplorerPane } from "@renderer/shared/ui/project-tree/ExplorerPane";
import { ModuleSheet } from "@renderer/shared/ui/project-tree/ModuleSheet";
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
  updateTree
} from "@renderer/shared/ui/project-tree/tree-utils";
import type {
  ProjectTreeEditorPanelProps,
  TreeNode
} from "@renderer/shared/ui/project-tree/types";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { useEffect, useMemo, useState } from "react";

export function ProjectTreeEditorPanel({
  busy,
  eyebrow,
  title,
  description,
  projectName,
  templateId,
  templateLabel,
  selectedStructurePaths,
  initialTree,
  useScaffoldBaseline = true,
  replaceTreeOnInitialChange = false,
  showModuleSelectionToggle = false,
  primaryActionLabel,
  onPrimaryAction,
  onTreeChange,
  secondaryActionLabel,
  onSecondaryAction,
  moduleSheet
}: ProjectTreeEditorPanelProps) {
  const baselineTree = useMemo(
    () => (useScaffoldBaseline ? buildBaselineTree(templateId, selectedStructurePaths) : []),
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
  const [selectedId, setSelectedId] = useState<string | null>(() => findFirstFileId(resolvedInitialTree));
  const [expandedIds, setExpandedIds] = useState<string[]>(() => collectFolderIds(resolvedInitialTree));
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);

  useEffect(() => {
    if (!useScaffoldBaseline && replaceTreeOnInitialChange) {
      setTree(resolvedInitialTree);
      setExpandedIds(collectFolderIds(resolvedInitialTree));
      setSelectedId(findFirstFileId(resolvedInitialTree));
      return;
    }

    setTree((current) => mergeTrees(resolvedInitialTree, current));
    setExpandedIds((current) => Array.from(new Set([...current, ...collectFolderIds(resolvedInitialTree)])));
    setSelectedId((current) => current ?? findFirstFileId(resolvedInitialTree));
  }, [replaceTreeOnInitialChange, resolvedInitialTree, useScaffoldBaseline]);

  useEffect(() => {
    onTreeChange(tree);
  }, [onTreeChange, tree]);

  const selectedNode = selectedId ? findNode(tree, selectedId) : null;
  const selectedPath = selectedId ? getNodePath(tree, selectedId) : null;
  const lockedFolderNames = new Set(
    (templateBlueprints[templateId]?.folders ?? []).map((folder) => folder.name)
  );
  const selectedContextNode = contextMenu ? findNode(tree, contextMenu.nodeId) : null;

  const handleToggleExpand = (id: string) => {
    setExpandedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
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
        name: renameValue.trim()
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
    const parentId = selectedId ? findContainingFolderId(tree, selectedId) : null;
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
      setExpandedIds((current) => (current.includes(parentId) ? current : [...current, parentId]));
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
        content: value
      }))
    );
  };

  const handleOpenContextMenu = (event: React.MouseEvent<HTMLButtonElement>, node: TreeNode) => {
    event.preventDefault();
    setSelectedId(node.id);

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id
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

  return (
    <section
      className="overflow-hidden rounded-[30px] border border-border bg-soft p-6 shadow-panel"
      onClick={() => setContextMenu(null)}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">{eyebrow}</p>
          <h3 className="mt-3 text-2xl font-semibold text-text">{title}</h3>
          <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
        </div>

        {secondaryActionLabel && onSecondaryAction ? (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-bg px-4 py-2 text-sm font-semibold text-muted transition hover:border-accent hover:text-text"
          >
            <UiIcon name="arrow-left" className="h-4 w-4" />
            {secondaryActionLabel}
          </button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
        <ExplorerPane
          savedProjectName={projectName}
          templateLabel={templateLabel}
          tree={tree}
          expandedIds={expandedIds}
          selectedId={selectedId}
          renamingId={renamingId}
          renameValue={renameValue}
          onSelect={setSelectedId}
          onToggleExpand={handleToggleExpand}
          onCreateEntry={handleCreateEntry}
          onOpenContextMenu={handleOpenContextMenu}
          onRenameValueChange={setRenameValue}
          onCommitRename={handleCommitRename}
          onCancelRename={() => setRenamingId(null)}
        />

        <EditorPane
          selectedNode={selectedNode}
          selectedPath={selectedPath}
          onContentChange={handleContentChange}
          showModuleSelectionToggle={showModuleSelectionToggle}
          onOpenModules={moduleSheet?.onOpen}
        />
      </div>

      <ContextMenu
        contextMenu={contextMenu}
        node={selectedContextNode}
        onNewFile={() => handleCreateEntry("file")}
        onNewFolder={() => handleCreateEntry("folder")}
        onRename={() => handleStartRename(selectedContextNode!.id)}
        onDelete={() => handleDeleteNode(selectedContextNode!.id)}
      />

      {moduleSheet ? (
        <ModuleSheet
          open={moduleSheet.open}
          busy={busy}
          lockedFolderNames={lockedFolderNames}
          selectedStructurePaths={selectedStructurePaths}
          onClose={moduleSheet.onClose}
          onToggleStructurePath={moduleSheet.onToggleStructurePath}
        />
      ) : null}

      {primaryActionLabel && onPrimaryAction ? (
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onPrimaryAction}
            className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-transparent bg-accent px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-accentHover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {primaryActionLabel}
            <UiIcon name="arrow-right" className="h-4 w-4 text-white" />
          </button>
        </div>
      ) : null}
    </section>
  );
}
