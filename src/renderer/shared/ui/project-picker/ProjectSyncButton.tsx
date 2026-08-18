import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { CardTitle } from "@renderer/shared/typography";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface ProjectSyncButtonProps {
  syncing: boolean;
  compact?: boolean;
  onClick: () => void;
}

export function ProjectSyncButton({
  syncing,
  compact = false,
  onClick
}: Readonly<ProjectSyncButtonProps>) {
  const { t } = useTranslation();

  return (
    <Tooltip
      content={compact ? t(translation.Workspace.SyncProject) : undefined}
      side="right"
    >
      <button
        type="button"
        disabled={syncing}
        onClick={onClick}
        className={clsx(
          "group/add flex w-full items-center rounded-[18px] text-left",
          "border border-dashed border-border bg-bg/60",
          "transition-[transform,box-shadow] duration-300",
          "hover:-translate-y-0.5 hover:border-accent/50 hover:bg-bg hover:shadow-panel",
          "active:scale-[0.98]",
          "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
          compact ? "justify-center p-2" : "gap-2.5 p-3"
        )}
      >
        <span
          className={clsx(
            "flex shrink-0 items-center justify-center rounded-[12px]",
            "border border-border bg-soft text-accent",
            "transition-transform duration-300",
            !syncing && "group-hover/add:rotate-90",
            compact ? "h-7 w-7" : "h-9 w-9"
          )}
        >
          <UiIcon
            name={syncing ? "refresh-circle" : "plus"}
            className={clsx("h-4 w-4", syncing && "animate-spin")}
          />
        </span>

        {compact ? null : (
          <>
            <CardTitle className="min-w-0 flex-1 truncate text-sm">
              {t(translation.Workspace.SyncProject)}
            </CardTitle>
            <span
              className={clsx(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                "border-border text-muted transition-transform duration-300",
                "group-hover/add:translate-x-0.5"
              )}
            >
              <UiIcon name="arrow-right" className="h-3 w-3" />
            </span>
          </>
        )}
      </button>
    </Tooltip>
  );
}
