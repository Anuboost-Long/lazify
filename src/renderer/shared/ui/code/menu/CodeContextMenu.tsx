import clsx from "clsx";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { SmallText } from "@renderer/shared/typography";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";

export interface CodeMenuItem {
  id: string;
  label: string;
  icon?: UiIconName;
  disabled?: boolean;
  onSelect: () => void;
}

interface CodeContextMenuProps {
  position: { x: number; y: number } | null;
  items: CodeMenuItem[];
  onClose: () => void;
}

const MENU_WIDTH = 208;
const ROW_HEIGHT = 36;
const MENU_PADDING = 16;
const VIEWPORT_MARGIN = 12;

export function CodeContextMenu({
  position,
  items,
  onClose
}: Readonly<CodeContextMenuProps>) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const open = position !== null && items.length > 0;

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("scroll", onClose, true);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("scroll", onClose, true);
    };
  }, [open, onClose]);

  if (!open) return null;

  const height = items.length * ROW_HEIGHT + MENU_PADDING;
  const left = Math.min(position.x, globalThis.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN);
  const top = Math.min(position.y, globalThis.innerHeight - height - VIEWPORT_MARGIN);

  /* Portalled to the body, not left where the code is: the pointer's
     coordinates are the viewport's, and `fixed` only means the viewport while
     no ancestor carries a transform, filter or backdrop-filter. Modals do —
     BaseModal translates its content and blurs its backdrop — so a menu
     rendered inside one is offset by the modal's own position, landing far
     from the text that was right-clicked. At the body it has no such ancestor,
     and z-[60] clears the modal layer it used to sit inside. */
  return createPortal(
    <div
      ref={rootRef}
      role="menu"
      className={clsx(
        "fixed z-[60] min-w-[13rem] rounded-[16px] border border-border",
        "bg-soft p-2 shadow-panel"
      )}
      style={{ left: Math.max(VIEWPORT_MARGIN, left), top: Math.max(VIEWPORT_MARGIN, top) }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          onClick={() => {
            item.onSelect();
            onClose();
          }}
          className={clsx(
            "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors",
            item.disabled
              ? "cursor-not-allowed opacity-40"
              : "hover:bg-accent/10 hover:text-accent"
          )}
        >
          {item.icon ? <UiIcon name={item.icon} className="h-3.5 w-3.5 shrink-0" /> : null}
          <SmallText as="span" className="!text-inherit">
            {item.label}
          </SmallText>
        </button>
      ))}
    </div>,
    document.body
  );
}
