import type { TreeNode } from "@renderer/shared/ui/project-tree/types";

interface ContextMenuProps {
  contextMenu: { x: number; y: number } | null;
  node: TreeNode | null;
  onNewFile: () => void;
  onNewFolder: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function ContextMenu({
  contextMenu,
  node,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete
}: ContextMenuProps) {
  if (!contextMenu || !node) {
    return null;
  }

  const canCreateInside = true;
  const canRename = true;
  const canDelete = true;
  const menuItems = [
    canCreateInside ? (
      <button
        key="new-file"
        type="button"
        onClick={onNewFile}
        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/[0.06]"
      >
        New file
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#8ab6cb]">+</span>
      </button>
    ) : null,
    canCreateInside ? (
      <button
        key="new-folder"
        type="button"
        onClick={onNewFolder}
        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/[0.06]"
      >
        New folder
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#8ab6cb]">+</span>
      </button>
    ) : null,
    canRename ? (
      <button
        key="rename"
        type="button"
        onClick={onRename}
        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/[0.06]"
      >
        Rename
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#8ab6cb]">F2</span>
      </button>
    ) : null,
    canDelete ? (
      <button
        key="delete"
        type="button"
        onClick={onDelete}
        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/[0.06]"
      >
        Delete
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#8ab6cb]">Del</span>
      </button>
    ) : null
  ].filter(Boolean);

  const menuWidth = 160;
  const menuHeight = menuItems.length * 40 + 16;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const left = Math.min(contextMenu.x, viewportWidth - menuWidth - 12);
  const top = Math.min(contextMenu.y, viewportHeight - menuHeight - 12);

  return (
    <div
      className="fixed z-50 min-w-[10rem] rounded-[16px] border border-white/10 bg-[#102230] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
      style={{ left, top }}
    >
      {menuItems}
    </div>
  );
}
