import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { Tooltip } from "@renderer/shared/ui/Tooltip";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";

/**
 * One small icon action on a source control row or group header. Kept separate
 * so rows, group headers, and any future context menu share a single hit-area
 * and hover treatment.
 */

interface RowActionProps {
  icon: UiIconName;
  /** Translation key; used as both tooltip and accessible name. */
  label: string;
  destructive?: boolean;
  onClick: () => void;
}

export function RowAction({ icon, label, destructive = false, onClick }: Readonly<RowActionProps>) {
  const { t } = useTranslation();
  const text = t(label);

  return (
    <Tooltip content={text} side="top">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
        aria-label={text}
        className={clsx(
          "flex h-5 w-5 items-center justify-center rounded transition-colors",
          destructive
            ? "text-muted hover:bg-error/10 hover:text-error"
            : "text-muted hover:bg-accent/10 hover:text-accent"
        )}
      >
        <UiIcon name={icon} className="h-3.5 w-3.5" />
      </button>
    </Tooltip>
  );
}
