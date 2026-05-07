import clsx from "clsx";
import type { ComponentPropsWithoutRef } from "react";
import UiIcon, { type UiIconName } from "./icons/UiIcon";

interface IconButtonProps extends ComponentPropsWithoutRef<"button"> {
  icon: UiIconName;
  iconClassName?: string;
}

export function IconButton({ icon, iconClassName, className, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        "flex items-center justify-center rounded p-1 transition-colors",
        "text-muted hover:bg-black/[0.06] hover:text-text",
        "dark:hover:bg-white/[0.08]",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      {...props}
    >
      <UiIcon name={icon} className={clsx("h-3.5 w-3.5", iconClassName)} />
    </button>
  );
}
