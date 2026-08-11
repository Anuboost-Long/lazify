import { translation } from "@renderer/i18n/translation";
import type {
  GitStatusEntry,
  ImportedProjectIndexResult,
  ProjectGitStatusResult,
} from "@renderer/shared/types/lazify";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import { EditorTabBar } from "@renderer/shared/ui/code/EditorTabBar";
import { FileQuickOpen } from "@renderer/shared/ui/command-palette/FileQuickOpen";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { ExplorerActions } from "@renderer/shared/ui/project-tree-optimized/ExplorerActions";
import { OptimizedEditorPane } from "@renderer/shared/ui/project-tree-optimized/OptimizedEditorPane";
import { findNodeById } from "@renderer/shared/ui/project-tree-optimized/tree-utils";
import { ProjectTreeEditorPanel } from "@renderer/shared/ui/project-tree/core/ProjectTreeEditorPanel";
import type { SidebarView } from "@renderer/shared/ui/project-tree/sidebar/types";
import { WorkbenchSidebar } from "@renderer/shared/ui/project-tree/sidebar/WorkbenchSidebar";
import { TreeContextMenu } from "@renderer/shared/ui/project-tree/TreeContextMenu";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useSyncedProjectTree } from "./useSyncedProjectTree";

interface SyncedProjectTreePanelProps {
  allowGitStatus?: boolean;
  busy: boolean;
  editable?: boolean;
  project: ImportedProjectIndexResult;
  /** Project tools shown in the workbench's right-hand rail. */
  toolViews?: SidebarView[];
  /** Opens the OS terminal at the project's folder, from the same rail. */
  onOpenConsole?: () => void;
  /** Starts a coding agent on this project, from the same rail. */
  onStartAgent?: () => void;
  renderGitInfo?: (props: {
    gitStatus: ProjectGitStatusResult | null;
    loading: boolean;
    /** Rendered unconditionally now, because it is an overlay. */
    open: boolean;
    onClose: () => void;
  }) => ReactNode;
  renderGitPane?: (props: {
    busy: boolean;
    gitStatus: ProjectGitStatusResult | null;
    loading: boolean;
    selectedPath: string | null;
    onSelect: (entry: GitStatusEntry) => void;
    projectPath: string;
    onBranchSwitched: () => void;
  }) => ReactNode;
}

export function SyncedProjectTreePanel({
  allowGitStatus = false,
  busy,
  editable = false,
  project,
  toolViews,
  onOpenConsole,
  onStartAgent,
  renderGitInfo,
  renderGitPane,
}: Readonly<SyncedProjectTreePanelProps>) {
  const { t } = useTranslation();
  const adapter = useSyncedProjectTree({
    allowGitStatus,
    editable,
    project,
  });

  return (
    <>
      <ProjectTreeEditorPanel
        busy={busy}
        mode={editable ? "editable" : "readonly"}
        eyebrow={t(translation.ProjectTree.ProjectContents)}
        title={project.projectName}
        description={t(translation.ProjectTree.ProjectContentsDesc)}
        projectName={project.projectName}
        subLabel={project.projectPath}
        layout="workbench"
        toolViews={toolViews}
        onOpenConsole={onOpenConsole}
        onStartAgent={onStartAgent}
        tree={adapter.editableTree}
        expandedIds={adapter.expandedIds}
        selectedId={adapter.selectedId}
        renamingId={adapter.renamingId}
        renameValue={adapter.renameValue}
        onCollapseAll={() => adapter.setExpandedIds([])}
        onCreateEntry={editable ? adapter.handleCreateEntry : undefined}
        onOpenContextMenu={
          editable
            ? (event, nodeId) => {
                const node = findNodeById(adapter.editableTree, nodeId);

                if (node) {
                  adapter.setContextMenu({
                    node,
                    x: event.clientX,
                    y: event.clientY,
                  });
                }
              }
            : undefined
        }
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
        renderSidebar={
          allowGitStatus && renderGitPane
            ? (explorer) => (
                <WorkbenchSidebar
                  activeId={adapter.activePanel}
                  onChange={(id) =>
                    adapter.setActivePanel(id as "explorer" | "git")
                  }
                  views={[
                    {
                      id: "explorer",
                      label: t(translation.ProjectTree.Explorer),
                      icon: "folder",
                      actions: editable ? (
                        <ExplorerActions
                          compact
                          onCreateEntry={adapter.handleCreateEntry}
                        />
                      ) : null,
                      content: explorer,
                    },
                    {
                      id: "git",
                      label: t(translation.GitStatus.Title),
                      icon: "activity",
                      actions: (
                        <Tooltip content={t(translation.ProjectTree.GitInfo)} side="bottom">
                          <button
                            type="button"
                            onClick={() => adapter.setShowGitInfo(true)}
                            aria-label={t(translation.ProjectTree.GitInfo)}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-accent/10 hover:text-accent"
                          >
                            <UiIcon name="journal-page" className="h-3.5 w-3.5" />
                          </button>
                        </Tooltip>
                      ),
                      content: renderGitPane({
                        busy,
                        gitStatus: adapter.gitStatus,
                        loading: adapter.gitStatusLoading,
                        selectedPath: adapter.activeTab?.filePath ?? null,
                        onSelect: adapter.handleOpenDiff,
                        projectPath: project.projectPath,
                        onBranchSwitched: adapter.refreshGitStatus,
                      }),
                    },
                  ]}
                />
              )
            : undefined
        }
        overlays={
          renderGitInfo
            ? renderGitInfo({
                gitStatus: adapter.gitStatus,
                loading: adapter.gitStatusLoading,
                open: adapter.showGitInfo,
                onClose: () => adapter.setShowGitInfo(false),
              })
            : null
        }
        editor={
          <OptimizedEditorPane
            chrome="flush"
            /* With nothing open the shell keeps its "no file selected" title. */
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
            selectedFileState={adapter.selectedFileState}
            /* Go to definition stays inside this workbench: the file it finds
               opens as another tab here, next to what the user was reading. */
            onOpenSymbol={(symbol, position) => void adapter.handleOpenSymbol(symbol, position)}
            focusLine={adapter.focusLine}
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
              onRevealInFinder={adapter.handleRevealInFinder}
            />
          ) : null
        }
      />

      {/* Cmd/Ctrl+P quick-open over this project's files. */}
      <FileQuickOpen
        tree={adapter.editableTree}
        onOpenFile={(entry) => {
          const node = findNodeById(adapter.editableTree, entry.id);
          if (node) adapter.handleSelectNode(node);
        }}
      />
    </>
  );
}
