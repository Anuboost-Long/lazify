import type { ReactNode } from "react";
import { BodyText, OverlineText, SectionTitle } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import {
  OptimizedTreeExplorerPane,
  type ExplorerNode,
} from "@renderer/shared/ui/project-tree-optimized/OptimizedTreeExplorerPane";

interface ProjectTreeEditorPanelProps<TNode extends ExplorerNode> {
  busy?: boolean;
  eyebrow: string;
  title: string;
  description: string;
  projectName: string;
  subLabel: string;
  infoBanner?: string;
  tree: TNode[];
  expandedIds: string[];
  selectedId: string | null;
  renamingId?: string | null;
  renameValue?: string;
  mode?: "editable" | "readonly";
  gridClassName?: string;
  headerAccessory?: ReactNode;
  editor: ReactNode;
  leftPane?: ReactNode;
  contextMenu?: ReactNode;
  extraContent?: ReactNode;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  primaryActionIcon?: ReactNode;
  secondaryActionIcon?: ReactNode;
  isChecked?: (nodeId: string) => boolean;
  includedFileCount?: number;
  totalFileCount?: number;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onCollapseAll?: () => void;
  onCreateEntry?: (type: "file" | "folder") => void;
  onOpenContextMenu?: (event: React.MouseEvent<HTMLButtonElement>, nodeId: string) => void;
  onToggleChecked?: (nodeId: string) => void;
  onRenameValueChange?: (value: string) => void;
  onCommitRename?: () => void;
  onCancelRename?: () => void;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  onClearContextMenu?: () => void;
}

export function ProjectTreeEditorPanel<TNode extends ExplorerNode>({
  busy = false,
  contextMenu,
  description,
  editor,
  expandedIds,
  extraContent,
  eyebrow,
  gridClassName = "xl:grid-cols-[260px_minmax(0,1fr)]",
  headerAccessory,
  includedFileCount,
  infoBanner,
  isChecked,
  leftPane,
  mode = "editable",
  onCancelRename,
  onClearContextMenu,
  onCollapseAll,
  onCommitRename,
  onCreateEntry,
  onOpenContextMenu,
  onPrimaryAction,
  onRenameValueChange,
  onSecondaryAction,
  onSelect,
  onToggleChecked,
  onToggleExpand,
  primaryActionIcon,
  primaryActionLabel,
  projectName,
  renameValue,
  renamingId,
  secondaryActionIcon,
  secondaryActionLabel,
  selectedId,
  subLabel,
  title,
  totalFileCount,
  tree,
}: ProjectTreeEditorPanelProps<TNode>) {
  return (
    <section
      className="overflow-hidden rounded-[30px] border border-border bg-soft p-6 shadow-panel"
      onClick={onClearContextMenu}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <OverlineText>
            {eyebrow}
          </OverlineText>
          <SectionTitle className="mt-3">{title}</SectionTitle>
          <BodyText tone="muted" className="mt-3 leading-6">{description}</BodyText>
        </div>

        {headerAccessory ? (
          <div className="flex w-full flex-col items-end gap-3 lg:w-auto">
            {headerAccessory}
          </div>
        ) : secondaryActionLabel && onSecondaryAction ? (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="inline-flex self-end items-center gap-2 rounded-full border border-border bg-bg px-4 py-2 text-sm font-semibold text-muted hover:border-accent hover:text-text"
          >
            {secondaryActionIcon ?? <UiIcon name="arrow-left" className="h-4 w-4" />}
            {secondaryActionLabel}
          </button>
        ) : null}
      </div>

      {extraContent}

      <div className={`mt-6 grid gap-5 ${gridClassName}`}>
        {leftPane ?? (
          <OptimizedTreeExplorerPane
            mode={mode}
            busy={busy}
            savedProjectName={projectName}
            subLabel={subLabel}
            infoBanner={infoBanner}
            tree={tree}
            expandedIds={expandedIds}
            selectedId={selectedId}
            renamingId={renamingId}
            renameValue={renameValue}
            isChecked={isChecked}
            onToggleChecked={onToggleChecked}
            includedFileCount={includedFileCount}
            totalFileCount={totalFileCount}
            onSelect={onSelect}
            onToggleExpand={onToggleExpand}
            onCollapseAll={onCollapseAll}
            onCreateEntry={onCreateEntry}
            onOpenContextMenu={onOpenContextMenu}
            onRenameValueChange={onRenameValueChange}
            onCommitRename={onCommitRename}
            onCancelRename={onCancelRename}
          />
        )}

        {editor}
      </div>

      {contextMenu}

      {primaryActionLabel && onPrimaryAction ? (
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onPrimaryAction}
            className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-transparent bg-accent px-5 py-3 text-sm font-semibold text-white shadow-glow hover:-translate-y-0.5 hover:bg-accentHover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {primaryActionLabel}
            {primaryActionIcon ?? <UiIcon name="arrow-right" className="h-4 w-4 text-white" />}
          </button>
        </div>
      ) : null}
    </section>
  );
}
