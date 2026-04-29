import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { ExplorerNode } from "@renderer/shared/ui/project-tree/ExplorerNode";
import { countNodes } from "@renderer/shared/ui/project-tree/tree-utils";
import type { TreeNode } from "@renderer/shared/ui/project-tree/types";

interface ExplorerPaneProps {
  savedProjectName: string;
  templateLabel: string;
  tree: TreeNode[];
  expandedIds: string[];
  selectedId: string | null;
  renamingId: string | null;
  renameValue: string;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onCreateEntry: (type: "file" | "folder") => void;
  onOpenContextMenu: (event: React.MouseEvent<HTMLButtonElement>, node: TreeNode) => void;
  onRenameValueChange: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
}

export function ExplorerPane({
  savedProjectName,
  templateLabel,
  tree,
  expandedIds,
  selectedId,
  renamingId,
  renameValue,
  onSelect,
  onToggleExpand,
  onCreateEntry,
  onOpenContextMenu,
  onRenameValueChange,
  onCommitRename,
  onCancelRename
}: ExplorerPaneProps) {
  return (
    <div className="h-[44rem] overflow-hidden rounded-[26px] border border-border bg-[#0b1720] shadow-[0_28px_80px_rgba(3,10,18,0.32)]">
      <div className="flex items-center gap-2 border-b border-white/10 bg-[#102230] px-5 py-3.5">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <div className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        <div className="ml-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#8ab6cb]">
          Explorer
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onCreateEntry("file");
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-200"
            aria-label="New file"
            title="New file"
          >
            <UiIcon name="plus" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onCreateEntry("folder");
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-200"
            aria-label="New folder"
            title="New folder"
          >
            <UiIcon name="folder" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="h-[calc(44rem-57px)] overflow-y-auto bg-[linear-gradient(180deg,#0f2230_0%,#0a141d_100%)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7ca6bb]">
          {savedProjectName}
        </p>
        <div className="mt-4 space-y-2">
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            {savedProjectName}/
          </div>
          <div className="rounded-xl border border-dashed border-white/10 px-3 py-2 text-sm text-[#88a7b6]">
            {templateLabel}
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
          Scaffold essentials are locked
        </div>
        <div className="mt-4 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9fc6d8]">
          {countNodes(tree)} items
        </div>
        <div className="mt-5 space-y-1">
          {tree.map((node) => (
            <ExplorerNode
              key={node.id}
              node={node}
              depth={0}
              expandedIds={expandedIds}
              selectedId={selectedId}
              renamingId={renamingId}
              renameValue={renameValue}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onOpenContextMenu={onOpenContextMenu}
              onRenameValueChange={onRenameValueChange}
              onCommitRename={onCommitRename}
              onCancelRename={onCancelRename}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
