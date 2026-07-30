import clsx from "clsx";
import { BodyText, Typography } from "@renderer/shared/typography";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";

interface SidebarNavItemProps {
  icon: UiIconName;
  label: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
}

/**
 * One row in the expanded drawer.
 *
 * Both lines truncate, and a description cut off at "Scan a local project folder
 * into the…" is worse than no description: it takes the space and withholds the
 * sentence. So the row carries a tooltip with both lines in full — which matters
 * more in Khmer and Chinese, where the *labels* run past the rail as well.
 */
export function SidebarNavItem({
  icon,
  label,
  description,
  isActive,
  onClick,
}: SidebarNavItemProps) {
  return (
    <Tooltip
      side="right"
      content={
        <>
          <span className="block font-medium text-text">{label}</span>
          <span className="mt-0.5 block text-muted">{description}</span>
        </>
      }
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={clsx(
          "flex w-full items-center gap-3 rounded-xl px-3 py-3",
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
        <div className="min-w-0">
          <Typography variant="body" className="truncate font-medium text-inherit">
            {label}
          </Typography>
          <BodyText className="truncate text-xs text-muted">{description}</BodyText>
        </div>
      </button>
    </Tooltip>
  );
}
