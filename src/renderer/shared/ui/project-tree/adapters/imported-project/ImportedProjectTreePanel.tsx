import { SelectInput, TextInput } from "@renderer/shared/ui/form/FormInput";
import { ProjectTreeEditorPanel as ProjectTreeEditorPanelShell } from "@renderer/shared/ui/project-tree/core/ProjectTreeEditorPanel";
import { OptimizedContextMenu } from "@renderer/shared/ui/project-tree-optimized/OptimizedContextMenu";
import { OptimizedEditorPane } from "@renderer/shared/ui/project-tree-optimized/OptimizedEditorPane";
import { findNodeById } from "@renderer/shared/ui/project-tree-optimized/tree-utils";
import type { OptimizedImportedProjectTreeProps } from "@renderer/shared/ui/project-tree-optimized/types";
import { useImportedProjectTree } from "./useImportedProjectTree";

export function ImportedProjectTreePanel({
  busy,
  editable = false,
  initialConfirmedStack,
  onSaveTemplate,
  projectName,
  projectPath,
  tree,
}: OptimizedImportedProjectTreeProps) {
  const adapter = useImportedProjectTree({
    initialConfirmedStack,
    onSaveTemplate,
    projectPath,
    tree,
  });
  const saveDisabledReason = adapter.confirmedStack
    ? null
    : "Select the project stack before saving the template.";

  return (
    <ProjectTreeEditorPanelShell
      busy={busy}
      mode={editable ? "editable" : "readonly"}
      eyebrow="Imported structure"
      title={`Optimized explorer for ${projectName}`}
      description="This viewer uses metadata-only scanning, lazy file loading, and virtualized rows so large projects stay responsive."
      projectName={projectName}
      subLabel={projectPath}
      infoBanner="Scan loaded — folders start collapsed, files load on demand."
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
            {adapter.includedFilePaths.size} of {adapter.totalFileCount} files selected
          </div>
          <SelectInput
            value={adapter.confirmedStack}
            onChange={(event) => adapter.setConfirmedStack(event.target.value)}
            icon="code"
            className="w-full max-w-[22rem] min-w-0"
          >
            <option value="">Select stack before saving</option>
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
            placeholder="Template name or leave blank for laz-temp-001"
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
            {adapter.saveBusy ? "Saving template..." : "Save as template"}
          </button>
          {saveDisabledReason ? (
            <p className="max-w-[22rem] text-xs leading-5 text-amber-800">
              {saveDisabledReason}
            </p>
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
          <OptimizedContextMenu
            contextMenu={adapter.contextMenu}
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
