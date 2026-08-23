import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { ContextMenu, type ContextMenuItem } from "@renderer/shared/ui/ContextMenu";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface RowMenuButtonProps {
  label: string;
  items: ContextMenuItem[];
  openAt: { x: number; y: number } | null;
  onOpenAtChange: (position: { x: number; y: number } | null) => void;
}

export function RowMenuButton({
  label,
  items,
  openAt,
  onOpenAtChange
}: Readonly<RowMenuButtonProps>) {
  const { t } = useTranslation();

  return (
    <>
      <button
        type="button"
        aria-label={`${t(translation.ApiStudio.RowOptions)} ${label}`}
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect();

          onOpenAtChange({ x: box.right - 8, y: box.bottom + 4 });
        }}
        className={clsx(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted",
          "transition-colors hover:bg-text/[0.06] hover:text-text"
        )}
      >
        <UiIcon name="more" className="h-3.5 w-3.5" />
      </button>

      <ContextMenu position={openAt} items={items} onClose={() => onOpenAtChange(null)} />
    </>
  );
}

export function useRowMenu() {
  return useState<{ x: number; y: number } | null>(null);
}
