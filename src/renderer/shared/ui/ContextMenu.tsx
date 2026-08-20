import clsx from "clsx";
import { useEffect } from "react";
import { createPortal } from "react-dom";

export interface ContextMenuItem {
  key: string;
  label: string;
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
        className="fixed inset-0 z-[100] cursor-default"
      />

      <div
        role="menu"
        style={{ left, top, width: MENU_WIDTH }}
        className={clsx(
          "fixed z-[101] rounded-xl border border-border bg-soft p-1 shadow-panel"
        )}
      >
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            role="menuitem"
            onClick={() => {
              onClose();
              item.onSelect();
            }}
            className={clsx(
              "flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-xs",
              "transition-colors",
              item.destructive
                ? "text-error hover:bg-error/10"
                : "text-text hover:bg-accent/10 hover:text-accent"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>,
    document.body
  );
}
