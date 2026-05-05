import { translation } from "@renderer/i18n/translation";
import { PillText } from "@renderer/shared/typography";
import type { TreeContextMenuState } from "@renderer/shared/ui/project-tree-optimized/types";
import { useTranslation } from "react-i18next";

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
  onDelete,
}: OptimizedContextMenuProps) {
  const { t } = useTranslation();
  if (!contextMenu) return null;

  const menuItems = [
    { key: "new-file",   label: translation.ProjectTree.NewFile,   hint: "+",   onClick: onNewFile },
    { key: "new-folder", label: translation.ProjectTree.NewFolder, hint: "+",   onClick: onNewFolder },
    { key: "rename",     label: translation.ProjectTree.ContextRename,     hint: "F2",  onClick: onRename },
    { key: "delete",     label: translation.ProjectTree.ContextDelete,     hint: "Del", onClick: onDelete },
  ];

  const menuWidth = 168;
  const menuHeight = menuItems.length * 40 + 16;
  const left = Math.min(contextMenu.x, window.innerWidth - menuWidth - 12);
  const top  = Math.min(contextMenu.y, window.innerHeight - menuHeight - 12);

  return (
    <div
      className="fixed z-30 min-w-[10.5rem] rounded-[16px] border border-border bg-soft p-2 shadow-panel"
      style={{ left, top }}
    >
      {menuItems.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={item.onClick}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-text transition-colors hover:bg-accent/10 hover:text-accent"
        >
          {t(item.label)}
          <PillText as="span" className="text-muted">
            {item.hint}
          </PillText>
        </button>
      ))}
    </div>
  );
}
