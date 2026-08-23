import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { MonoText, OverlineText } from "@renderer/shared/typography";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { ProjectTreeActions } from "./ProjectTreeActions";
import {
  ProjectTreeList,
  type ProjectTreeListNode,
} from "./ProjectTreeList";

interface ProjectTreeListPanelProps {
  mode?: "editable" | "readonly";
  showHeader?: boolean;
  projectName: string;
  projectPath: string;
  tree: ProjectTreeListNode[];
  expandedIds: string[];
  selectedId: string | null;
  renamingId?: string | null;
  renameValue?: string;
  isChecked?: (nodeId: string) => boolean;
  onToggleChecked?: (nodeId: string) => void;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onCollapseAll?: () => void;
  onCreateEntry?: (type: "file" | "folder") => void;
  onOpenContextMenu?: (
    event: React.MouseEvent<HTMLButtonElement>,
    nodeId: string,
  ) => void;
  onRenameValueChange?: (value: string) => void;
  onCommitRename?: () => void;
  onCancelRename?: () => void;
}

export function ProjectTreeListPanel({
  mode = "editable",
  showHeader = true,
  projectName,
  projectPath,
  tree,
  expandedIds,
  selectedId,
  renamingId,
  renameValue = "",
  isChecked,
  onToggleChecked,
  onSelect,
  onToggleExpand,
  onCollapseAll,
  onCreateEntry,
  onOpenContextMenu,
  onRenameValueChange,
  onCommitRename,
  onCancelRename,
}: Readonly<ProjectTreeListPanelProps>) {
  const { t } = useTranslation();
  const editable = mode === "editable";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-bg">
      {showHeader ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-border bg-soft px-3 py-2">
          <OverlineText className="text-muted">
            {t(translation.ProjectTree.Explorer)}
          </OverlineText>
          <div className="ml-auto flex items-center gap-1">
            {editable && onCreateEntry ? (
              <ProjectTreeActions compact onCreateEntry={onCreateEntry} />
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col bg-bg p-2">
        <div className="flex items-center gap-2 px-1.5 pb-1.5">
          <MonoText
            as="span"
            className="min-w-0 flex-1 truncate text-xs text-muted"
            title={projectPath}
          >
            {projectName}/
          </MonoText>
          {onCollapseAll ? (
            <Tooltip content={t(translation.ProjectTree.CollapseAll)} side="bottom">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onCollapseAll();
                }}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-accent/10 hover:text-accent"
              >
                <UiIcon name="collapse" className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          ) : null}
        </div>

        <ProjectTreeList
          className="min-h-0 flex-1"
          nodes={tree}
          expandedIds={expandedIds}
          selectedId={selectedId}
          renamingId={renamingId}
          renameValue={renameValue}
          isChecked={isChecked}
          onSelect={(node) => onSelect(node.id)}
          onToggleExpand={(node) => onToggleExpand(node.id)}
          onToggleChecked={
            onToggleChecked ? (node) => onToggleChecked(node.id) : undefined
          }
          onOpenContextMenu={
            onOpenContextMenu
              ? (event, node) => onOpenContextMenu(event, node.id)
              : undefined
          }
          onRenameValueChange={onRenameValueChange}
          onCommitRename={onCommitRename}
          onCancelRename={onCancelRename}
        />
      </div>
    </div>
  );
}
