import { useState, type ReactNode } from "react";

import { type ProjectTreeListNode } from "./ProjectTreeList";
import { ProjectTreeListPanel } from "./ProjectTreeListPanel";
import { WorkbenchToolOverlay } from "../sidebar/WorkbenchToolOverlay";
import { WorkbenchRightToolBar } from "../sidebar/WorkbenchRightToolBar";
import type { SidebarView } from "../sidebar/types";
import { SplitPane } from "@renderer/shared/ui/split/SplitPane";

interface ProjectTreeEditorPanelProps<TNode extends ProjectTreeListNode> {
  projectName: string;
  projectPath: string;
  tree: TNode[];
  expandedIds: string[];
  selectedId: string | null;
  renamingId?: string | null;
  renameValue?: string;
  mode?: "editable" | "readonly";
  renderSidebar?: (list: ReactNode) => ReactNode;
  toolViews?: SidebarView[];
  onOpenConsole?: () => void;
  onStartAgent?: () => void;
  headerAccessory?: ReactNode;
  editor: ReactNode;
  contextMenu?: ReactNode;
  overlays?: ReactNode;
  extraContent?: ReactNode;
  isChecked?: (nodeId: string) => boolean;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onCollapseAll?: () => void;
  onCreateEntry?: (type: "file" | "folder") => void;
  onOpenContextMenu?: (
    event: React.MouseEvent<HTMLButtonElement>,
    nodeId: string,
  ) => void;
  onToggleChecked?: (nodeId: string) => void;
  onRenameValueChange?: (value: string) => void;
  onCommitRename?: () => void;
  onCancelRename?: () => void;
}

export function ProjectTreeEditorPanel<TNode extends ProjectTreeListNode>({
  contextMenu,
  editor,
  expandedIds,
  extraContent,
  headerAccessory,
  isChecked,
  mode = "editable",
  onOpenConsole,
  onCancelRename,
  onCollapseAll,
  onCommitRename,
  onCreateEntry,
  onOpenContextMenu,
  onRenameValueChange,
  onSelect,
  onStartAgent,
  overlays,
  onToggleChecked,
  onToggleExpand,
  projectName,
  projectPath,
  renameValue,
  renamingId,
  renderSidebar,
  selectedId,
  toolViews,
  tree,
}: Readonly<ProjectTreeEditorPanelProps<TNode>>) {
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const list = (
    <ProjectTreeListPanel
      mode={mode}
      showHeader={!renderSidebar}
      projectName={projectName}
      projectPath={projectPath}
      tree={tree}
      expandedIds={expandedIds}
      selectedId={selectedId}
      renamingId={renamingId}
      renameValue={renameValue}
      isChecked={isChecked}
      onToggleChecked={onToggleChecked}
      onSelect={onSelect}
      onToggleExpand={onToggleExpand}
      onCollapseAll={onCollapseAll}
      onCreateEntry={onCreateEntry}
      onOpenContextMenu={onOpenContextMenu}
      onRenameValueChange={onRenameValueChange}
      onCommitRename={onCommitRename}
      onCancelRename={onCancelRename}
    />
  );

  return (
    <div className="flex h-full min-h-[560px] flex-col gap-3">
      {extraContent || headerAccessory ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">{extraContent}</div>
          {headerAccessory}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden rounded-[18px] border border-border bg-bg">
        <SplitPane
          className="h-full"
          storageKey="lazify-project-workbench-split"
          defaultSize={300}
          minSize={200}
          minOtherSize={360}
          first={renderSidebar ? renderSidebar(list) : list}
          second={
            toolViews && toolViews.length > 0 ? (
              <div className="flex h-full min-w-0">
                <div className="relative min-w-0 flex-1 overflow-hidden">
                  {editor}
                  <WorkbenchToolOverlay
                    views={toolViews}
                    activeId={activeToolId}
                    onClose={() => setActiveToolId(null)}
                  />
                </div>
                <WorkbenchRightToolBar
                  views={toolViews}
                  activeId={activeToolId}
                  onChange={setActiveToolId}
                  onOpenConsole={onOpenConsole}
                  onStartAgent={onStartAgent}
                />
              </div>
            ) : (
              editor
            )
          }
        />
      </div>

      {contextMenu}
      {overlays}
    </div>
  );
}
