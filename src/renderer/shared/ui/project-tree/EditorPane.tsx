import clsx from "clsx";
import { useMemo, useRef } from "react";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { TreeNode } from "@renderer/shared/ui/project-tree/types";

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
          <p className="truncate text-sm font-semibold text-text">
            {selectedNode?.type === "file" ? selectedNode.name : "No file selected"}
          </p>
          <p className="truncate text-[11px] uppercase tracking-[0.18em] text-muted">
            {selectedPath ?? "Select a file from the explorer"}
          </p>
        </div>
        {showModuleSelectionToggle && onOpenModules ? (
          <button
            type="button"
            onClick={onOpenModules}
            className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent transition-colors hover:border-accent/50 hover:bg-accent/20"
          >
            Modules
          </button>
        ) : null}
        <div className="rounded-full border border-border bg-bg px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          {selectedNode?.type === "file" ? "Editable" : "Folder"}
        </div>
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
              placeholder="Write the initial file content here..."
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-border bg-soft/30 p-8 text-center">
            <div className="max-w-md">
              <p className="text-lg font-semibold text-text">
                Select a file to edit its contents
              </p>
              <p className="mt-3 text-sm leading-6 text-muted">
                The explorer stays on the left. Pick any editable file and this panel becomes a large content editor, similar to the main area in VS Code.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
