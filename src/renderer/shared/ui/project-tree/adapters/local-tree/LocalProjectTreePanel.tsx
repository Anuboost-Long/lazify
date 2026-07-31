import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { TreeContextMenu } from "@renderer/shared/ui/project-tree/TreeContextMenu";
import { ProjectTreeEditorPanel as ProjectTreeEditorPanelShell } from "@renderer/shared/ui/project-tree/core/ProjectTreeEditorPanel";
import { EditorPane } from "@renderer/shared/ui/project-tree/EditorPane";
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
  useScaffoldBaseline = true,
  replaceTreeOnInitialChange = false,
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
    useScaffoldBaseline,
  });

  return (
    <ProjectTreeEditorPanelShell
      busy={busy}
      eyebrow={eyebrow}
      title={title}
      description={description}
      projectName={projectName}
      subLabel={templateLabel}
      infoBanner={t(translation.ProjectTree.EssentialsLocked)}
      tree={adapter.tree}
      expandedIds={adapter.expandedIds}
      selectedId={adapter.selectedId}
      renamingId={adapter.renamingId}
      renameValue={adapter.renameValue}
      onSelect={adapter.setSelectedId}
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
      primaryActionLabel={primaryActionLabel}
      primaryActionIcon={
        <UiIcon name="arrow-right" className="h-4 w-4 text-white" />
      }
      onPrimaryAction={onPrimaryAction}
      editor={
        <EditorPane
          selectedNode={adapter.selectedNode}
          selectedPath={adapter.selectedPath}
          onContentChange={adapter.handleContentChange}
          showModuleSelectionToggle={showModuleSelectionToggle}
          onOpenModules={moduleSheet?.onOpen}
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
            lockedFolderNames={adapter.lockedFolderNames}
            selectedStructurePaths={selectedStructurePaths}
            onClose={moduleSheet.onClose}
            onToggleStructurePath={moduleSheet.onToggleStructurePath}
          />
        ) : null
      }
    />
  );
}
