import { translation } from "@renderer/i18n/translation";
import { PillText } from "@renderer/shared/typography";
import { useTranslation } from "react-i18next";

interface TreeContextMenuProps {
  /** Where to open, or null when the menu is closed. */
  position: { x: number; y: number } | null;
  onNewFile: () => void;
  onNewFolder: () => void;
  onRename: () => void;
  onDelete: () => void;
}

const MENU_WIDTH = 168;
/** Row height plus the wrapper's padding, used to keep the menu on screen. */
const ROW_HEIGHT = 40;
const MENU_PADDING = 16;

/** The right-click menu for every project tree, editable or not. */
export function TreeContextMenu({
  position,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
}: Readonly<TreeContextMenuProps>) {
  const { t } = useTranslation();

  if (!position) return null;

  const menuItems = [
    { key: "new-file", label: translation.ProjectTree.NewFile, hint: "+", onClick: onNewFile },
    { key: "new-folder", label: translation.ProjectTree.NewFolder, hint: "+", onClick: onNewFolder },
    { key: "rename", label: translation.ProjectTree.ContextRename, hint: "F2", onClick: onRename },
    { key: "delete", label: translation.ProjectTree.ContextDelete, hint: "Del", onClick: onDelete },
  ];

  const menuHeight = menuItems.length * ROW_HEIGHT + MENU_PADDING;
  const left = Math.min(position.x, globalThis.innerWidth - MENU_WIDTH - 12);
  const top = Math.min(position.y, globalThis.innerHeight - menuHeight - 12);

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
