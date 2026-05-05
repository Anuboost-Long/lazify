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
  onDelete,
}: ContextMenuProps) {
  if (!contextMenu || !node) return null;

  const menuItems = [
    { key: "new-file",   label: "New file",   hint: "+",   onClick: onNewFile },
    { key: "new-folder", label: "New folder", hint: "+",   onClick: onNewFolder },
    { key: "rename",     label: "Rename",     hint: "F2",  onClick: onRename },
    { key: "delete",     label: "Delete",     hint: "Del", onClick: onDelete },
  ];

  const menuWidth = 160;
  const menuHeight = menuItems.length * 40 + 16;
  const left = Math.min(contextMenu.x, window.innerWidth - menuWidth - 12);
  const top  = Math.min(contextMenu.y, window.innerHeight - menuHeight - 12);

  return (
    <div
      className="fixed z-30 min-w-[10rem] rounded-[16px] border border-border bg-soft p-2 shadow-panel"
      style={{ left, top }}
    >
      {menuItems.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={item.onClick}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-text transition-colors hover:bg-accent/10 hover:text-accent"
        >
          {item.label}
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted">
            {item.hint}
          </span>
        </button>
      ))}
    </div>
  );
}
