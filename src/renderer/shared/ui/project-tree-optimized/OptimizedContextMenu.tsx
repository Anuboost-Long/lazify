import type { TreeContextMenuState } from "@renderer/shared/ui/project-tree-optimized/types";

interface OptimizedContextMenuProps {
  contextMenu: TreeContextMenuState | null;
  onNewFile: () => void;
  onNewFolder: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function OptimizedContextMenu({
  contextMenu,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete
}: OptimizedContextMenuProps) {
  if (!contextMenu) {
    return null;
  }

  const menuItems = [
    {
      key: "new-file",
      label: "New file",
      hint: "+",
      onClick: onNewFile
    },
    {
      key: "new-folder",
      label: "New folder",
      hint: "+",
      onClick: onNewFolder
    },
    {
      key: "rename",
      label: "Rename",
      hint: "F2",
      onClick: onRename
    },
    {
      key: "delete",
      label: "Delete",
      hint: "Del",
      onClick: onDelete
    }
  ];

  const menuWidth = 168;
  const menuHeight = menuItems.length * 40 + 16;
  const left = Math.min(contextMenu.x, window.innerWidth - menuWidth - 12);
  const top = Math.min(contextMenu.y, window.innerHeight - menuHeight - 12);

  return (
    <div
      className="fixed z-30 min-w-[10.5rem] rounded-[16px] border border-white/10 bg-[#102230] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
      style={{ left, top }}
    >
      {menuItems.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={item.onClick}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-100 hover:bg-white/[0.06]"
        >
          {item.label}
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#8ab6cb]">
            {item.hint}
          </span>
        </button>
      ))}
    </div>
  );
}
