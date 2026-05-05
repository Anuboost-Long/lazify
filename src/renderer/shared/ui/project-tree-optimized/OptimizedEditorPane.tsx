import { translation } from "@renderer/i18n/translation";
import { BodyText, CardTitle, OverlineText, PillText } from "@renderer/shared/typography";
import type { ImportedProjectIndexNode } from "@renderer/shared/types/lazify";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { FileContentState } from "@renderer/shared/ui/project-tree-optimized/types";
import clsx from "clsx";
import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

interface OptimizedEditorPaneProps {
  selectedNode: ImportedProjectIndexNode | null;
  selectedFileState: FileContentState | null;
}

export function OptimizedEditorPane({
  selectedNode,
  selectedFileState,
}: OptimizedEditorPaneProps) {
  const { t } = useTranslation();
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const lineNumbers = useMemo(() => {
    const content = selectedFileState?.content ?? "";
    const lineCount = Math.max(1, content.split("\n").length);
    return Array.from({ length: lineCount }, (_, index) => index + 1);
  }, [selectedFileState?.content]);

  return (
    <div className="h-[44rem] overflow-hidden rounded-[26px] border border-border bg-bg shadow-panel">

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-soft px-5 py-3.5">
        <UiIcon name="page" className="h-4 w-4 text-warning" />
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-sm">
            {selectedNode?.type === "file" ? selectedNode.name : t(translation.ProjectTree.NoFileSelected)}
          </CardTitle>
          <OverlineText className="truncate text-muted">
            {selectedNode?.type === "file"
              ? selectedNode.absolutePath
              : t(translation.ProjectTree.SelectFileFromExplorer)}
          </OverlineText>
        </div>
        <PillText className="rounded-full border border-border bg-bg px-3 py-1 text-muted">
          {t(translation.ProjectTree.ReadOnly)}
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
          !selectedFileState ||
          selectedFileState.status === "idle" ||
          selectedFileState.status === "loading" ? (
            <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-border bg-soft/30 p-8 text-center">
              <div>
                <CardTitle className="text-lg">{t(translation.ProjectTree.LoadingFilePreview)}</CardTitle>
                <BodyText className="mt-3 text-muted">
                  {t(translation.ProjectTree.LoadingFilePreviewDesc)}
                </BodyText>
              </div>
            </div>
          ) : selectedFileState.status === "error" ? (
            <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-error/25 bg-error/5 p-8 text-center">
              <div>
                <CardTitle className="text-lg text-error">{t(translation.ProjectTree.LoadFilePreviewError)}</CardTitle>
                <BodyText className="mt-3 whitespace-pre-wrap text-text/70">
                  {selectedFileState.content}
                </BodyText>
              </div>
            </div>
          ) : (
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
                readOnly
                spellCheck={false}
                value={selectedFileState?.content ?? ""}
                onScroll={(event) => {
                  if (gutterRef.current) {
                    gutterRef.current.scrollTop = event.currentTarget.scrollTop;
                  }
                }}
                className="h-full w-full resize-none overflow-y-auto bg-transparent px-5 py-4 font-mono text-sm leading-7 text-text outline-none"
              />
            </div>
          )
        ) : (
          <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-border bg-soft/30 p-8 text-center">
            <div className="max-w-md">
              <CardTitle className="text-lg">
                {t(translation.ProjectTree.SelectFileToPreview)}
              </CardTitle>
              <BodyText className="mt-3 text-muted">
                {t(translation.ProjectTree.SelectFileToPreviewDesc)}
              </BodyText>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
