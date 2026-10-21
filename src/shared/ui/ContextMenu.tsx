import clsx from "clsx";
import { useEffect } from "react";
import { createPortal } from "react-dom";

import { useCoverGuests } from "@/shared/ui/GuestView";
import UiIcon, { type UiIconName } from "@/shared/ui/icons/UiIcon";

export interface ContextMenuItem {
  key: string;
  label: string;
  icon?: UiIconName;
  /** The current choice, when the menu picks one of several. */
  selected?: boolean;
  destructive?: boolean;
  onSelect: () => void;
}

interface ContextMenuProps {
  position: { x: number; y: number } | null;
  items: ContextMenuItem[];
  onClose: () => void;
}

const MENU_WIDTH = 200;
const ROW_HEIGHT = 32;
const EDGE_GAP = 12;

export function ContextMenu({ position, items, onClose }: Readonly<ContextMenuProps>) {
  useCoverGuests(position !== null);

  useEffect(() => {
    if (!position) return;

    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    globalThis.addEventListener("keydown", dismiss);

    return () => globalThis.removeEventListener("keydown", dismiss);
  }, [position, onClose]);

  if (!position || items.length === 0) return null;

  const height = items.length * ROW_HEIGHT + 8;
  const left = Math.min(position.x, globalThis.innerWidth - MENU_WIDTH - EDGE_GAP);
  const top = Math.min(position.y, globalThis.innerHeight - height - EDGE_GAP);

  return createPortal(
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onClose}
        onContextMenu={(event) => {
          event.preventDefault();
          onClose();
        }}
        className="fixed inset-0 z-100 cursor-default"
      />

      <div
        role="menu"
        style={{ left, top, width: MENU_WIDTH }}
        className={clsx(
          "fixed z-101 rounded-xl border border-border bg-soft p-1 shadow-panel"
        )}
      >
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            role={item.selected === undefined ? "menuitem" : "menuitemradio"}
            aria-checked={item.selected}
            onClick={() => {
              onClose();
              item.onSelect();
            }}
            className={clsx(
              "relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs",
              "transition-colors",
              item.destructive && "text-error hover:bg-error/10",
              !item.destructive &&
                item.selected &&
                "bg-bg/60 text-text before:absolute before:inset-y-1.5 before:left-0 before:w-0.75 before:rounded-full before:bg-accent",
              !item.destructive && !item.selected && "text-text hover:bg-accent/10 hover:text-accent"
            )}
          >
            {item.icon && (
              <UiIcon
                name={item.icon}
                filled={item.selected}
                className={clsx("h-4 w-4 shrink-0", item.selected ? "text-accent" : "text-muted")}
              />
            )}
            {item.label}
          </button>
        ))}
      </div>
    </>,
    document.body
  );
}
