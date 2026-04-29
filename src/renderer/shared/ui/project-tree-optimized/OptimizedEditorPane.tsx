import type { ImportedProjectIndexNode } from "@renderer/shared/types/lazify";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { FileContentState } from "@renderer/shared/ui/project-tree-optimized/types";
import clsx from "clsx";
import { useMemo, useRef } from "react";

interface OptimizedEditorPaneProps {
  selectedNode: ImportedProjectIndexNode | null;
  selectedFileState: FileContentState | null;
}

export function OptimizedEditorPane({
  selectedNode,
  selectedFileState,
}: OptimizedEditorPaneProps) {
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const lineNumbers = useMemo(() => {
    const content = selectedFileState?.content ?? "";
    const lineCount = Math.max(1, content.split("\n").length);
    return Array.from({ length: lineCount }, (_, index) => index + 1);
  }, [selectedFileState?.content]);

  return (
    <div className="h-[44rem] overflow-hidden rounded-[26px] border border-border bg-[#0b1720] shadow-[0_28px_80px_rgba(3,10,18,0.32)]">
      <div className="flex items-center gap-2 border-b border-white/10 bg-[#102230] px-5 py-3.5">
        <UiIcon name="page" className="h-4 w-4 text-[#ffcf66]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-cyan-50">
            {selectedNode?.type === "file"
              ? selectedNode.name
              : "No file selected"}
          </p>
          <p className="truncate text-[11px] uppercase tracking-[0.18em] text-[#8ab6cb]">
            {selectedNode?.type === "file"
              ? selectedNode.absolutePath
              : "Select a file from the explorer"}
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9fc6d8]">
          Read only
        </div>
      </div>

      <div
        className="h-[calc(44rem-57px)] p-5"
        style={{
          background:
            "radial-gradient(circle at top right, rgba(34,211,238,0.08), transparent 26%), linear-gradient(180deg, #0d1c27 0%, #0a141d 100%)",
        }}
      >
        {selectedNode?.type === "file" ? (
          !selectedFileState ||
          selectedFileState.status === "idle" ||
          selectedFileState.status === "loading" ? (
            <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
              <div>
                <p className="text-lg font-semibold text-slate-100">
                  Loading file preview
                </p>
                <p className="mt-3 text-sm leading-6 text-[#8fb0bf]">
                  Content is fetched only for the selected file.
                </p>
              </div>
            </div>
          ) : selectedFileState.status === "error" ? (
            <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-red-400/20 bg-red-500/5 p-8 text-center">
              <div>
                <p className="text-lg font-semibold text-red-200">
                  Unable to load file preview
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-red-100/90">
                  {selectedFileState.content}
                </p>
              </div>
            </div>
          ) : (
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
                readOnly
                spellCheck={false}
                value={selectedFileState?.content ?? ""}
                onScroll={(event) => {
                  if (gutterRef.current) {
                    gutterRef.current.scrollTop = event.currentTarget.scrollTop;
                  }
                }}
                className={clsx(
                  "h-full w-full resize-none overflow-y-auto bg-transparent px-5 py-4 font-mono text-sm leading-7 outline-none",
                  "text-slate-50"
                )}
              />
            </div>
          )
        ) : (
          <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
            <div className="max-w-md">
              <p className="text-lg font-semibold text-slate-100">
                Select a file to preview its contents
              </p>
              <p className="mt-3 text-sm leading-6 text-[#8fb0bf]">
                Folders are listed in the explorer, but file content is loaded
                only on demand.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
