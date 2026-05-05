import type { ReactNode } from "react";
import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { ProjectTreeEditorPanel } from "@renderer/shared/ui/project-tree/core/ProjectTreeEditorPanel";
import { OptimizedContextMenu } from "@renderer/shared/ui/project-tree-optimized/OptimizedContextMenu";
import { OptimizedEditorPane } from "@renderer/shared/ui/project-tree-optimized/OptimizedEditorPane";
import { findNodeById } from "@renderer/shared/ui/project-tree-optimized/tree-utils";
import type {
  GitStatusEntry,
  ImportedProjectIndexResult,
  ProjectGitStatusResult,
} from "@renderer/shared/types/lazify";
import { useSyncedProjectTree } from "./useSyncedProjectTree";
import { useTranslation } from "react-i18next";

interface SyncedProjectTreePanelProps {
  allowGitStatus?: boolean;
  busy: boolean;
  editable?: boolean;
  project: ImportedProjectIndexResult;
  renderGitInfo?: (props: {
    gitStatus: ProjectGitStatusResult | null;
    loading: boolean;
  }) => ReactNode;
  renderGitPane?: (props: {
    busy: boolean;
    gitStatus: ProjectGitStatusResult | null;
    loading: boolean;
    selectedPath: string | null;
    onSelect: (entry: GitStatusEntry) => void;
  }) => ReactNode;
}

export function SyncedProjectTreePanel({
  allowGitStatus = false,
  busy,
  editable = false,
  project,
  renderGitInfo,
  renderGitPane,
}: SyncedProjectTreePanelProps) {
  const { t } = useTranslation();
  const adapter = useSyncedProjectTree({
    allowGitStatus,
    editable,
    project,
  });

  return (
    <ProjectTreeEditorPanel
      busy={busy}
      mode={editable ? "editable" : "readonly"}
      eyebrow={t(translation.ProjectTree.ProjectContents)}
      title={project.projectName}
      description={t(translation.ProjectTree.ProjectContentsDesc)}
      projectName={project.projectName}
      subLabel={project.projectPath}
      gridClassName="xl:grid-cols-[320px_minmax(0,1fr)]"
      tree={adapter.editableTree}
      expandedIds={adapter.expandedIds}
      selectedId={adapter.selectedId}
      renamingId={adapter.renamingId}
      renameValue={adapter.renameValue}
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
      onSelect={(id) => {
        const node = findNodeById(adapter.editableTree, id);
        if (node) adapter.handleSelectNode(node);
      }}
      onToggleExpand={adapter.handleToggleExpand}
      headerAccessory={
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          <UiIcon name="folder" className="h-4 w-4 text-accent" />
          {editable ? t(translation.ProjectTree.EditableWorkspaceView) : t(translation.ProjectTree.ReadOnlyWorkspaceView)}
        </div>
      }
      extraContent={
        allowGitStatus ? (
          <div className="mt-5 flex flex-col gap-4">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => adapter.setShowGitInfo((current) => !current)}
                className={
                  adapter.showGitInfo
                    ? "inline-flex items-center gap-2 rounded-full border border-accent bg-accentSoft px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent"
                    : "inline-flex items-center gap-2 rounded-full border border-border bg-bg px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted"
                }
              >
                <UiIcon name="activity" className="h-4 w-4" />
                {t(translation.ProjectTree.GitInfo)}
              </button>
            </div>
            {adapter.showGitInfo && renderGitInfo ? renderGitInfo({
              gitStatus: adapter.gitStatus,
              loading: adapter.gitStatusLoading,
            }) : null}
            <div className="inline-flex rounded-full border border-border bg-bg p-1">
              <button
                type="button"
                onClick={() => adapter.setActivePanel("explorer")}
                className={
                  adapter.activePanel === "explorer"
                    ? "rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white"
                    : "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted"
                }
              >
                {t(translation.ProjectTree.Explorer)}
              </button>
              <button
                type="button"
                onClick={() => adapter.setActivePanel("git")}
                className={
                  adapter.activePanel === "git"
                    ? "rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white"
                    : "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted"
                }
              >
                {t(translation.GitStatus.Title)}
              </button>
            </div>
          </div>
        ) : null
      }
      leftPane={
        adapter.activePanel === "git" && allowGitStatus && renderGitPane ? renderGitPane({
          busy,
          gitStatus: adapter.gitStatus,
          loading: adapter.gitStatusLoading,
          selectedPath: adapter.activeFilePath,
          onSelect: adapter.handleOpenGitEntry,
        }) : undefined
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
