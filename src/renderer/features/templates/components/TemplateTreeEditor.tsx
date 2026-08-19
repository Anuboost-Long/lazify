import { EditorTabBar } from "@renderer/shared/ui/code/EditorTabBar";
import { FileQuickOpen } from "@renderer/shared/ui/command-palette/FileQuickOpen";
import { ProjectTreeEditor } from "@renderer/shared/ui/project-tree/core/ProjectTreeEditor";
import { ProjectTreeEditorPanel } from "@renderer/shared/ui/project-tree/core/ProjectTreeEditorPanel";
import { TreeContextMenu } from "@renderer/shared/ui/project-tree/TreeContextMenu";
import type { ProjectTreeNode } from "@renderer/shared/types/lazify";
import { useTemplateTree } from "./useTemplateTree";

interface TemplateTreeEditorProps {
  projectName: string;
  initialTree?: ProjectTreeNode[] | null;
  replaceTreeOnInitialChange?: boolean;
  onTreeChange: (tree: ProjectTreeNode[]) => void;
}

export function TemplateTreeEditor({
  projectName,
  initialTree,
  replaceTreeOnInitialChange = false,
  onTreeChange,
}: Readonly<TemplateTreeEditorProps>) {
  const adapter = useTemplateTree({
    initialTree,
    onTreeChange,
    replaceTreeOnInitialChange,
  });

  return (
    <>
      <ProjectTreeEditorPanel
        projectName={projectName}
        projectPath={projectName}
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
        editor={
          <ProjectTreeEditor
            editable
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
      />

      <FileQuickOpen
        tree={adapter.tree}
        onOpenFile={(entry) => adapter.handleSelectNode(entry.id)}
      />
    </>
  );
}
