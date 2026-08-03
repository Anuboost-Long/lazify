import clsx from "clsx";
import { useState, type ReactNode } from "react";
import { translation } from "@renderer/i18n/translation";
import { SmallText } from "@renderer/shared/typography";
import { CodeSurface } from "@renderer/shared/ui/code/CodeSurface";
import { EditorEmptyState } from "@renderer/shared/ui/code/EditorEmptyState";
import { DiffView, type DiffViewMode } from "@renderer/shared/ui/code/diff/DiffView";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { ConfirmModal } from "@renderer/shared/ui/modal/ConfirmModal";
import type { EditorTab } from "@renderer/shared/ui/code/EditorTabBar";
import type { SymbolPosition } from "@renderer/shared/ui/code/symbol-at-point";
import {
  EditorPaneNotice,
  EditorPaneShell,
} from "@renderer/shared/ui/code/EditorPaneShell";
import type { FileContentState } from "@renderer/shared/ui/project-tree-optimized/types";
import { useTranslation } from "react-i18next";

interface OptimizedEditorPaneProps {
  selectedNode: {
    name: string;
    type: "file" | "folder";
    absolutePath?: string;
  } | null;
  selectedFileState: FileContentState | null;
  editable?: boolean;
  selectedPath?: string | null;
  onContentChange?: (value: string) => void;
  headerAction?: ReactNode;
  /** Open-file tabs rendered in the header instead of the title block. */
  tabs?: ReactNode;
  /** The tab being shown; a "diff" tab renders its patch, not the file. */
  activeTab?: EditorTab | null;
  /** "flush" drops the pane's own card so it can fill a shared frame. */
  chrome?: "card" | "flush";
  /** Empties the editor. Omit where the pane has no tabs to close. */
  onCloseAll?: () => void;
  /** How many tabs closing all would take, named in the confirmation. */
  openTabCount?: number;
  /** Clicking an identifier in the file asks to go to its declaration. */
  onOpenSymbol?: (symbol: string, position?: SymbolPosition) => void;
  /** 1-based line to reveal and mark once the file is showing. */
  focusLine?: number | null;
}

/** Shared file editor: live projects are read-only; template snapshots opt into editing. */
export function OptimizedEditorPane({
  selectedNode,
  selectedFileState,
  editable = false,
  selectedPath,
  onContentChange,
  headerAction,
  tabs,
  activeTab = null,
  chrome = "card",
  onCloseAll,
  openTabCount = 0,
  onOpenSymbol,
  focusLine,
}: Readonly<OptimizedEditorPaneProps>) {
  const { t } = useTranslation();
  const flush = chrome === "flush";
  const isDiff = !editable && activeTab?.kind === "diff";
  const [diffMode, setDiffMode] = useState<DiffViewMode>("unified");
  // Closing every tab at once throws away the whole reading context, so it is
  // gated the way closing an agent terminal is.
  const [confirmCloseAll, setConfirmCloseAll] = useState(false);
  const isFile = selectedNode?.type === "file";
  const status = selectedFileState?.status;
  const pending =
    !editable && (!selectedFileState || status === "idle" || status === "loading");

  // Nothing open: no header and no badge, the way VS Code leaves an empty
  // editor group — but the surface still says so, matching the agent panel's
  // blank state. The standalone card keeps its own frame and notice.
  if (flush && !tabs && !isFile) {
    return <EditorEmptyState />;
  }

  const body = () => {
    if (!isFile) {
      return (
        <EditorPaneNotice
          chrome={chrome}
          title={t(editable ? translation.ProjectTree.SelectFileToEdit : translation.ProjectTree.SelectFileToPreview)}
          description={t(editable ? translation.ProjectTree.SelectFileToEditDesc : translation.ProjectTree.SelectFileToPreviewDesc)}
        />
      );
    }

    if (pending) {
      return (
        <EditorPaneNotice
          chrome={chrome}
          title={t(translation.ProjectTree.LoadingFilePreview)}
          description={t(translation.ProjectTree.LoadingFilePreviewDesc)}
        />
      );
    }

    if (!editable && status === "error") {
      return (
        <EditorPaneNotice
          chrome={chrome}
          tone="error"
          title={t(translation.ProjectTree.LoadFilePreviewError)}
          description={selectedFileState?.content}
        />
      );
    }

    if (isDiff) {
      return (
        <DiffView
          diff={selectedFileState?.content ?? ""}
          mode={diffMode}
          fileName={selectedNode.name}
          // The diff carries the whole file, so its single "@@" line says
          // nothing the reader does not already see.
          showHunkHeaders={false}
        />
      );
    }

    return (
      <CodeSurface
        editable={editable}
        variant={flush ? "flush" : "panel"}
        content={selectedFileState?.content ?? ""}
        fileName={selectedNode.name}
        onContentChange={editable ? onContentChange : undefined}
        // Only the file view resolves symbols; a diff's line numbers belong to
        // the patch, not the file, so a jump into one would land nowhere.
        onOpenSymbol={editable ? undefined : onOpenSymbol}
        focusLine={focusLine}
      />
    );
  };

  return (
    <EditorPaneShell
      chrome={chrome}
      tabs={tabs}
      headerAction={
        <>
          {headerAction}
          {isDiff ? (
            <div className="flex shrink-0 items-center rounded-md border border-border p-0.5">
              {(["unified", "split"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDiffMode(mode)}
                  className={clsx(
                    "rounded px-2 py-0.5 transition-colors",
                    diffMode === mode ? "bg-text/10" : "hover:bg-text/[0.06]"
                  )}
                >
                  <SmallText as="span" className={diffMode === mode ? "!text-text" : "!text-muted"}>
                    {t(
                      mode === "unified"
                        ? translation.Agents.DiffUnified
                        : translation.Agents.DiffSplit
                    )}
                  </SmallText>
                </button>
              ))}
            </div>
          ) : null}

          {/* Only worth offering once something is open. */}
          {onCloseAll && tabs ? (
            <Tooltip content={t(translation.ProjectTree.CloseAllTabs)} side="bottom">
              <button
                type="button"
                onClick={() => setConfirmCloseAll(true)}
                aria-label={t(translation.ProjectTree.CloseAllTabs)}
                className={clsx(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                  "text-muted transition-colors hover:bg-error/10 hover:text-error"
                )}
              >
                <UiIcon name="xmark" className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          ) : null}
        </>
      }
      icon={editable ? "package" : "page"}
      title={
        isFile ? selectedNode.name : t(translation.ProjectTree.NoFileSelected)
      }
      subtitle={
        isFile
          ? (selectedPath ?? selectedNode.absolutePath ?? selectedNode.name)
          : t(translation.ProjectTree.SelectFileFromExplorer)
      }
      badge={t(editable ? translation.ProjectTree.Editable : translation.ProjectTree.ReadOnly)}
    >
      {body()}

      <ConfirmModal
        open={confirmCloseAll}
        title={t(translation.ProjectTree.CloseAllTabsTitle)}
        description={t(translation.ProjectTree.CloseAllTabsDesc, { count: openTabCount })}
        confirmLabel={t(translation.ProjectTree.CloseAllTabs)}
        destructive
        onConfirm={() => {
          onCloseAll?.();
          setConfirmCloseAll(false);
        }}
        onCancel={() => setConfirmCloseAll(false)}
      />
    </EditorPaneShell>
  );
}
