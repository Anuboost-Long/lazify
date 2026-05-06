import clsx from "clsx";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";

interface SidebarMiniItemProps {
  icon: UiIconName;
  label: string;
  isActive: boolean;
  showTooltip?: boolean;
  onClick: () => void;
}

export function SidebarMiniItem({
  icon,
  label,
  isActive,
  showTooltip = true,
  onClick,
}: SidebarMiniItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={showTooltip ? label : undefined}
      className={clsx(
        "flex w-full items-center justify-center rounded-xl py-3",
        "text-left text-sm",
        isActive
          ? "bg-bg text-text"
          : "text-muted hover:bg-bg/70 hover:text-text"
      )}
    >
      <UiIcon
        name={icon}
        className={clsx("h-5 w-5 shrink-0", isActive ? "text-accent" : "text-muted")}
      />
    </button>
  );
}
