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
  onOpenModules
}: EditorPaneProps) {
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const lineNumbers = useMemo(() => {
    const content = selectedNode?.content ?? "";
    const lineCount = Math.max(1, content.split("\n").length);
    return Array.from({ length: lineCount }, (_, index) => index + 1);
  }, [selectedNode?.content]);

  return (
    <div className="h-[44rem] overflow-hidden rounded-[26px] border border-border bg-[#0b1720] shadow-[0_28px_80px_rgba(3,10,18,0.32)]">
      <div className="flex items-center gap-2 border-b border-white/10 bg-[#102230] px-5 py-3.5">
        <UiIcon name="package" className="h-4 w-4 text-[#ffcf66]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-cyan-50">
            {selectedNode?.type === "file" ? selectedNode.name : "No file selected"}
          </p>
          <p className="truncate text-[11px] uppercase tracking-[0.18em] text-[#8ab6cb]">
            {selectedPath ?? "Select a file from the explorer"}
          </p>
        </div>
        {showModuleSelectionToggle && onOpenModules ? (
          <button
            type="button"
            onClick={onOpenModules}
            className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200"
          >
            Modules
          </button>
        ) : null}
        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9fc6d8]">
          {selectedNode?.type === "file" ? "Editable" : "Folder"}
        </div>
      </div>

      <div
        className="h-[calc(44rem-57px)] p-5"
        style={{
          background:
            "radial-gradient(circle at top right, rgba(34,211,238,0.08), transparent 26%), linear-gradient(180deg, #0d1c27 0%, #0a141d 100%)"
        }}
      >
        {selectedNode?.type === "file" ? (
          <div
            className={clsx(
              "flex h-full overflow-hidden rounded-[20px] border",
              "border-cyan-400/20 bg-black/20 text-slate-50"
            )}
          >
            <div
              ref={gutterRef}
              className="w-14 shrink-0 overflow-hidden border-r border-white/10 bg-black/10 px-3 py-4 text-right font-mono text-xs leading-7 text-[#5f8296]"
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
              className={clsx(
                "h-full w-full resize-none overflow-y-auto bg-transparent px-5 py-4 font-mono text-sm leading-7 outline-none",
                "text-slate-50"
              )}
              placeholder="Write the initial file content here..."
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
            <div className="max-w-md">
              <p className="text-lg font-semibold text-slate-100">
                Select a file to edit its contents
              </p>
              <p className="mt-3 text-sm leading-6 text-[#8fb0bf]">
                The explorer stays on the left. Pick any editable file and this panel becomes a large content editor, similar to the main area in VS Code.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
