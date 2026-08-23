import clsx from "clsx";

import { Tooltip } from "@renderer/shared/ui/Tooltip";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";

export interface ControlProps {
  icon: UiIconName;
  label: string;
  disabled?: boolean;

  active?: boolean;
  onClick: () => void;
}

export function Control({
  icon,
  label,
  disabled = false,
  active = false,
  onClick
}: Readonly<ControlProps>) {
  return (
    <Tooltip content={label} side="top">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={active}
        className={clsx(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
          disabled
            ? "cursor-not-allowed text-muted opacity-40"
            : "text-text hover:bg-text/[0.06]",
          active && !disabled && "bg-accent/15 !text-accent"
        )}
      >
        <UiIcon name={icon} className="h-3.5 w-3.5" />
      </button>
    </Tooltip>
  );
}
