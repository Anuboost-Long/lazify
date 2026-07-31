import clsx from "clsx";
import type { ComponentPropsWithoutRef } from "react";
import { Tooltip, type TooltipSide } from "./Tooltip";
import UiIcon, { type UiIconName } from "./icons/UiIcon";

interface IconButtonProps extends ComponentPropsWithoutRef<"button"> {
  icon: UiIconName;
  iconClassName?: string;
  /** Which way the tooltip opens. Toolbar buttons usually want the default. */
  tooltipSide?: TooltipSide;
}

/**
 * An icon-only button, which is exactly the kind that needs a label somewhere.
 *
 * `title` is honoured as a real tooltip rather than the native one: every caller
 * already passes it, and the native attribute ignored the *Show tooltips*
 * setting and took a second to appear. The attribute itself is dropped so the
 * two do not both fire.
 */
export function IconButton({
  icon,
  iconClassName,
  className,
  title,
  tooltipSide,
  ...props
}: IconButtonProps) {
  return (
    <Tooltip content={title} side={tooltipSide}>
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
    </Tooltip>
  );
}
