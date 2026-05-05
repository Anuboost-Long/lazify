import clsx from "clsx";
import { useMemo, useRef } from "react";
import { translation } from "@renderer/i18n/translation";
import { BodyText, CardTitle, OverlineText, PillText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { TreeNode } from "@renderer/shared/ui/project-tree/types";
import { useTranslation } from "react-i18next";

interface EditorPaneProps {
  selectedNode: TreeNode | null;
  selectedPath: string | null;
  onContentChange: (value: string) => void;
  showModuleSelectionToggle?: boolean;
  onOpenModules?: () => void;
}

export function EditorPane({
  selectedNode,
  selectedPath,
  onContentChange,
  showModuleSelectionToggle = false,
  onOpenModules,
}: EditorPaneProps) {
  const { t } = useTranslation();
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const lineNumbers = useMemo(() => {
    const content = selectedNode?.content ?? "";
    const lineCount = Math.max(1, content.split("\n").length);
    return Array.from({ length: lineCount }, (_, index) => index + 1);
  }, [selectedNode?.content]);

  return (
    <div className="h-[44rem] overflow-hidden rounded-[26px] border border-border bg-bg shadow-panel">

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-soft px-5 py-3.5">
        <UiIcon name="package" className="h-4 w-4 text-warning" />
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-sm">
            {selectedNode?.type === "file" ? selectedNode.name : t(translation.ProjectTree.NoFileSelected)}
          </CardTitle>
          <OverlineText className="truncate text-muted">
            {selectedPath ?? t(translation.ProjectTree.SelectFileFromExplorer)}
          </OverlineText>
        </div>
        {showModuleSelectionToggle && onOpenModules ? (
          <button
            type="button"
            onClick={onOpenModules}
            className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent transition-colors hover:border-accent/50 hover:bg-accent/20"
          >
            {t(translation.ProjectTree.Modules)}
          </button>
        ) : null}
        <PillText className="rounded-full border border-border bg-bg px-3 py-1 text-muted">
          {selectedNode?.type === "file" ? t(translation.ProjectTree.Editable) : t(translation.ProjectTree.Folder)}
        </PillText>
      </div>

      {/* Body */}
      <div
        className="h-[calc(44rem-57px)] p-5"
        style={{
          background:
            "radial-gradient(circle at top right, rgb(var(--color-accent) / 0.06), transparent 30%), rgb(var(--color-bg))",
        }}
      >
        {selectedNode?.type === "file" ? (
          <div
            className={clsx(
              "flex h-full overflow-hidden rounded-[20px] border",
              "border-accent/15 bg-bg/60 text-text"
            )}
          >
            <div
              ref={gutterRef}
              className="w-14 shrink-0 overflow-hidden border-r border-border bg-bg/60 px-3 py-4 text-right font-mono text-xs leading-7 text-muted/50"
            >
              {lineNumbers.map((lineNumber) => (
                <div key={lineNumber}>{lineNumber}</div>
              ))}
            </div>

            <textarea
              value={selectedNode.content ?? ""}
              onChange={(event) => onContentChange(event.target.value)}
              onScroll={(event) => {
                if (gutterRef.current) {
                  gutterRef.current.scrollTop = event.currentTarget.scrollTop;
                }
              }}
              spellCheck={false}
              className="h-full w-full resize-none overflow-y-auto bg-transparent px-5 py-4 font-mono text-sm leading-7 text-text outline-none"
              placeholder={t(translation.ProjectTree.FileContentPlaceholder)}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-border bg-soft/30 p-8 text-center">
            <div className="max-w-md">
              <CardTitle className="text-lg">
                {t(translation.ProjectTree.SelectFileToEdit)}
              </CardTitle>
              <BodyText className="mt-3 text-muted">
                {t(translation.ProjectTree.SelectFileToEditDesc)}
              </BodyText>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
