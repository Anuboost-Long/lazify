import { translation } from "@renderer/i18n/translation";
import { EditorTabBar } from "@renderer/shared/ui/code/EditorTabBar";
import { FileQuickOpen } from "@renderer/shared/ui/command-palette/FileQuickOpen";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { TreeContextMenu } from "@renderer/shared/ui/project-tree/TreeContextMenu";
import { ProjectTreeEditorPanel as ProjectTreeEditorPanelShell } from "@renderer/shared/ui/project-tree/core/ProjectTreeEditorPanel";
import { OptimizedEditorPane } from "@renderer/shared/ui/project-tree-optimized/OptimizedEditorPane";
import { ModuleSheet } from "@renderer/shared/ui/project-tree/ModuleSheet";
import type { ProjectTreeEditorPanelProps } from "@renderer/shared/ui/project-tree/types";
import { useTranslation } from "react-i18next";
import { useLocalProjectTree } from "./useLocalProjectTree";

export function LocalProjectTreePanel({
  busy,
  eyebrow,
  title,
  description,
  projectName,
  templateId,
  templateLabel,
  selectedStructurePaths,
  initialTree,
  replaceTreeOnInitialChange = false,
  layout = "card",
  showModuleSelectionToggle = false,
  primaryActionLabel,
  onPrimaryAction,
  onTreeChange,
  secondaryActionLabel,
  onSecondaryAction,
  moduleSheet,
}: ProjectTreeEditorPanelProps) {
  const { t } = useTranslation();
  const adapter = useLocalProjectTree({
    initialTree,
    onTreeChange,
    replaceTreeOnInitialChange,
    selectedStructurePaths,
    templateId,
  });

  return (
    <>
      <ProjectTreeEditorPanelShell
        busy={busy}
        eyebrow={eyebrow}
        title={title}
        description={description}
        projectName={projectName}
        subLabel={templateLabel}
        infoBanner={t(translation.ProjectTree.EssentialsLocked)}
        layout={layout}
        tree={adapter.tree}
        expandedIds={adapter.expandedIds}
        selectedId={adapter.selectedId}
        renamingId={adapter.renamingId}
        renameValue={adapter.renameValue}
        onSelect={adapter.handleSelectNode}
        onToggleExpand={adapter.handleToggleExpand}
        onCollapseAll={() => adapter.setExpandedIds([])}
        onCreateEntry={adapter.handleCreateEntry}
        onOpenContextMenu={adapter.handleOpenContextMenu}
        onRenameValueChange={adapter.setRenameValue}
        onCommitRename={adapter.handleCommitRename}
        onCancelRename={() => adapter.setRenamingId(null)}
        onClearContextMenu={() => adapter.setContextMenu(null)}
        secondaryActionLabel={secondaryActionLabel}
        secondaryActionIcon={<UiIcon name="arrow-left" className="h-4 w-4" />}
        onSecondaryAction={onSecondaryAction}
        primaryActionLabel={layout === "card" ? primaryActionLabel : undefined}
        primaryActionIcon={
          <UiIcon name="arrow-right" className="h-4 w-4 text-white" />
        }
        onPrimaryAction={layout === "card" ? onPrimaryAction : undefined}
        editor={
          <OptimizedEditorPane
            editable
            chrome={layout === "workbench" ? "flush" : "card"}
            tabs={
              adapter.openFiles.length > 0 ? (
                <EditorTabBar
                  tabs={adapter.openFiles}
                  activePath={adapter.activeFilePath}
                  onSelect={adapter.handleSelectOpenFile}
                  onClose={adapter.handleCloseOpenFile}
                  onReorder={adapter.handleReorderOpenFiles}
                />
              ) : undefined
            }
            activeTab={adapter.activeTab}
            onCloseAll={adapter.handleCloseAllOpenFiles}
            openTabCount={adapter.openFiles.length}
            selectedNode={adapter.activeFileNode}
            selectedFileState={
              adapter.activeFileNode?.type === "file"
                ? {
                    status: "loaded",
                    content: adapter.activeFileNode.content ?? "",
                  }
                : null
            }
            selectedPath={adapter.activeFilePath}
            onContentChange={adapter.handleContentChange}
            headerAction={
              showModuleSelectionToggle && moduleSheet ? (
                <button
                  type="button"
                  onClick={moduleSheet.onOpen}
                  className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent transition-colors hover:border-accent/50 hover:bg-accent/20"
                >
                  {t(translation.ProjectTree.Modules)}
                </button>
              ) : null
            }
          />
        }
        contextMenu={
          <TreeContextMenu
            position={adapter.selectedContextNode ? adapter.contextMenu : null}
            onNewFile={() => adapter.handleCreateEntry("file")}
            onNewFolder={() => adapter.handleCreateEntry("folder")}
            onRename={() =>
              adapter.handleStartRename(adapter.selectedContextNode!.id)
            }
            onDelete={() =>
              adapter.handleDeleteNode(adapter.selectedContextNode!.id)
            }
          />
        }
        extraContent={
          moduleSheet ? (
            <ModuleSheet
              open={moduleSheet.open}
              busy={busy}
              options={moduleSheet.options}
              lockedFolderNames={adapter.lockedFolderNames}
              selectedStructurePaths={selectedStructurePaths}
              onClose={moduleSheet.onClose}
              onToggleStructurePath={moduleSheet.onToggleStructurePath}
            />
          ) : null
        }
      />

      <FileQuickOpen
        tree={adapter.tree}
        onOpenFile={(entry) => adapter.handleSelectNode(entry.id)}
      />
    </>
  );
}
