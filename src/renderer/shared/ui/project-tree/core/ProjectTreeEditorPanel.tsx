import clsx from "clsx";
import { useState, type ReactNode } from "react";
import { BodyText, OverlineText, SectionTitle } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { SplitPane } from "@renderer/shared/ui/split/SplitPane";
import { WorkbenchToolRail } from "@renderer/shared/ui/project-tree/sidebar/WorkbenchToolRail";
import { WorkbenchToolOverlay } from "@renderer/shared/ui/project-tree/sidebar/WorkbenchToolOverlay";
import type { SidebarView } from "@renderer/shared/ui/project-tree/sidebar/types";
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
  /**
   * "card" keeps the titled panel with its side-by-side grid. "workbench"
   * drops the outer card and the title block — which repeat what the page
   * header already says — and joins the explorer and editor into one frame
   * split by a draggable divider, so both panes get the page's full width.
   */
  layout?: "card" | "workbench";
  gridClassName?: string;
  /**
   * Wraps the explorer in a sidebar shell that can switch between it and other
   * views. When given, the shell owns the header, so the explorer draws none.
   * Workbench layout only.
   */
  renderSidebar?: (explorer: ReactNode) => ReactNode;
  /**
   * Project tools reachable from an icon rail on the right edge. Closed by
   * default, so the editor keeps the full frame height. Workbench layout only.
   */
  toolViews?: SidebarView[];
  /** Opens the OS terminal at the project's folder, from the same rail as
      `toolViews`. Absent hides the button. Workbench layout only. */
  onOpenConsole?: () => void;
  /** Starts a coding agent on this project, from the same rail as `toolViews`.
      Absent hides the button. Workbench layout only. */
  onStartAgent?: () => void;
  headerAccessory?: ReactNode;
  editor: ReactNode;
  leftPane?: ReactNode;
  contextMenu?: ReactNode;
  /** Modals and other overlays. Portalled, so they cost no layout space. */
  overlays?: ReactNode;
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
  layout = "card",
  leftPane,
  mode = "editable",
  onOpenConsole,
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
  onStartAgent,
  overlays,
  onToggleChecked,
  onToggleExpand,
  primaryActionIcon,
  primaryActionLabel,
  projectName,
  renameValue,
  renamingId,
  renderSidebar,
  secondaryActionIcon,
  secondaryActionLabel,
  selectedId,
  subLabel,
  title,
  totalFileCount,
  toolViews,
  tree,
}: ProjectTreeEditorPanelProps<TNode>) {
  // Which tool panel is open, or null for none — the default, so the editor
  // starts at full height.
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const explorer = (
    <OptimizedTreeExplorerPane
      mode={mode}
      chrome={layout === "workbench" ? "flush" : "card"}
      showHeader={!(layout === "workbench" && renderSidebar)}
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
  );

  if (layout === "workbench") {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3" onClick={onClearContextMenu}>
        {extraContent || headerAccessory ? (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">{extraContent}</div>
            {headerAccessory}
          </div>
        ) : null}

        {/* One frame, one border. The divider is a seam between the panes
            rather than a gap between two cards. */}
        <div className="min-h-0 flex-1 overflow-hidden rounded-[18px] border border-border bg-bg">
          <SplitPane
            className="h-full"
            storageKey="lazify-project-workbench-split"
            defaultSize={300}
            minSize={200}
            minOtherSize={360}
            first={renderSidebar ? renderSidebar(explorer) : (leftPane ?? explorer)}
            second={
              toolViews && toolViews.length > 0 ? (
                <div className="flex h-full min-w-0">
                  {/* The overlay covers this whole area when a tool is open,
                      and stays mounted behind it when closed. */}
                  <div className="relative min-w-0 flex-1 overflow-hidden">
                    {editor}
                    <WorkbenchToolOverlay
                      views={toolViews}
                      activeId={activeToolId}
                      onClose={() => setActiveToolId(null)}
                    />
                  </div>
                  <WorkbenchToolRail
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
        {leftPane ?? explorer}

        {editor}
      </div>

      {contextMenu}
      {overlays}

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
