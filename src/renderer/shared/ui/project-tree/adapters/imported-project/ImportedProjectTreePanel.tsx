import { translation } from "@renderer/i18n/translation";
import { BodyText } from "@renderer/shared/typography";
import { SelectInput, TextInput } from "@renderer/shared/ui/form/FormInput";
import { ProjectTreeEditorPanel as ProjectTreeEditorPanelShell } from "@renderer/shared/ui/project-tree/core/ProjectTreeEditorPanel";
import { TreeContextMenu } from "@renderer/shared/ui/project-tree/TreeContextMenu";
import { OptimizedEditorPane } from "@renderer/shared/ui/project-tree-optimized/OptimizedEditorPane";
import { findNodeById } from "@renderer/shared/ui/project-tree-optimized/tree-utils";
import type { OptimizedImportedProjectTreeProps } from "@renderer/shared/ui/project-tree-optimized/types";
import { useImportedProjectTree } from "./useImportedProjectTree";
import { useTranslation } from "react-i18next";

export function ImportedProjectTreePanel({
  busy,
  editable = false,
  initialConfirmedStack,
  onSaveTemplate,
  projectName,
  projectPath,
  tree,
}: OptimizedImportedProjectTreeProps) {
  const { t } = useTranslation();
  const adapter = useImportedProjectTree({
    initialConfirmedStack,
    onSaveTemplate,
    projectPath,
    tree,
  });
  const saveDisabledReason = adapter.confirmedStack
    ? null
    : t(translation.ProjectTree.SelectStackWarning);

  return (
    <ProjectTreeEditorPanelShell
      busy={busy}
      mode={editable ? "editable" : "readonly"}
      eyebrow={t(translation.ProjectTree.ImportedStructure)}
      title={t(translation.ProjectTree.ExplorerTitle, { project: projectName })}
      description={t(translation.ProjectTree.ExplorerDesc)}
      projectName={projectName}
      subLabel={projectPath}
      infoBanner={t(translation.ProjectTree.ScanLoaded)}
      gridClassName="xl:grid-cols-[320px_minmax(0,1fr)]"
      tree={adapter.editableTree}
      expandedIds={adapter.expandedIds}
      selectedId={adapter.selectedId}
      renamingId={adapter.renamingId}
      renameValue={adapter.renameValue}
      isChecked={adapter.handleIsChecked}
      onToggleChecked={adapter.handleToggleChecked}
      includedFileCount={adapter.includedFilePaths.size}
      totalFileCount={adapter.totalFileCount}
      onSelect={(id) => {
        const node = findNodeById(adapter.editableTree, id);
        if (node) adapter.handleSelectNode(node);
      }}
      onToggleExpand={adapter.handleToggleExpand}
      onCollapseAll={() => adapter.setExpandedIds([])}
      onCreateEntry={editable ? adapter.handleCreateEntry : undefined}
      onOpenContextMenu={editable ? (event, nodeId) => {
        const node = findNodeById(adapter.editableTree, nodeId);

        if (node) {
          adapter.setContextMenu({ node, x: event.clientX, y: event.clientY });
        }
      } : undefined}
      onRenameValueChange={adapter.setRenameValue}
      onCommitRename={adapter.handleCommitRename}
      onCancelRename={() => {
        adapter.setRenamingId(null);
        adapter.setRenameValue("");
      }}
      headerAccessory={
        <>
          <div className="rounded-full border border-emerald-300/30 bg-emerald-100/70 px-3 py-1 text-xs font-semibold text-emerald-900">
            {t(translation.ProjectTree.FilesSelected, { selected: adapter.includedFilePaths.size, total: adapter.totalFileCount })}
          </div>
          <SelectInput
            value={adapter.confirmedStack}
            onChange={(event) => adapter.setConfirmedStack(event.target.value)}
            icon="code"
            className="w-full max-w-[22rem] min-w-0"
          >
            <option value="">{t(translation.ProjectTree.SelectStackFirst)}</option>
            <option value="react-vite">React Vite</option>
            <option value="react-next">React Next.js</option>
            <option value="react-cra">React CRA</option>
            <option value="react-unknown">React Other</option>
            <option value="react-native-expo">React Native Expo</option>
            <option value="react-native-cli">React Native CLI</option>
            <option value="node-api">Node API</option>
            <option value="electron">Electron</option>
            <option value="unknown">Unknown / Other</option>
          </SelectInput>
          <TextInput
            value={adapter.templateName}
            onChange={(event) => adapter.setTemplateName(event.target.value)}
            placeholder={t(translation.ProjectTree.TemplateNamePlaceholder)}
            icon="package"
            className="w-full max-w-[22rem] min-w-0"
          />
          <button
            type="button"
            disabled={adapter.saveBusy || adapter.includedFilePaths.size === 0 || !adapter.confirmedStack}
            onClick={() => void adapter.handleSaveTemplate()}
            className="inline-flex items-center justify-center rounded-[16px] border border-transparent bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accentHover disabled:cursor-not-allowed disabled:opacity-60"
            title={saveDisabledReason ?? undefined}
          >
            {adapter.saveBusy ? t(translation.ProjectTree.SavingTemplate) : t(translation.ProjectTree.SaveAsTemplate)}
          </button>
          {saveDisabledReason ? (
            <BodyText className="max-w-[22rem] text-xs text-amber-800">
              {saveDisabledReason}
            </BodyText>
          ) : null}
        </>
      }
      editor={
        <OptimizedEditorPane
          selectedNode={adapter.selectedNode}
          selectedFileState={adapter.selectedFileState}
        />
      }
      contextMenu={
        editable ? (
          <TreeContextMenu
            position={adapter.contextMenu}
            onNewFile={() => adapter.handleCreateEntry("file")}
            onNewFolder={() => adapter.handleCreateEntry("folder")}
            onRename={adapter.handleStartRename}
            onDelete={adapter.handleDeleteNode}
          />
        ) : null
      }
    />
  );
}
