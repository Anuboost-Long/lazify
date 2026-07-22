import clsx from "clsx";
import { BodyText, CardTitle, PillText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { IconButton } from "@renderer/shared/ui/IconButton";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import { formatDate, formatTime, useDateTimeFormat } from "@renderer/shared/hooks/use-date-time-format";
import { getTechIconName } from "@renderer/shared/lib/icon-map";
import DevIcon from "@renderer/shared/ui/icons/DevIcon";
import { CardShapes } from "@renderer/shared/ui/card/CardShapes";
import { SheetStack } from "@renderer/shared/ui/card/SheetStack";
import { formatStackLabel } from "./utils";

interface SyncedProjectItemProps {
  active: boolean;
  project: SyncedWorkspaceProject;
  syncing: boolean;
  onOpen: (projectPath: string) => void;
  onRemove: (projectPath: string) => void;
  onResync: (projectPath: string) => void;
}

export function SyncedProjectItem({
  active,
  project,
  syncing,
  onOpen,
  onRemove,
  onResync
}: SyncedProjectItemProps) {
  const { dateFormat, timeFormat } = useDateTimeFormat();
  const syncedAt = new Date(project.lastSyncedAt);
  const formattedSyncedAt = `${formatDate(syncedAt, dateFormat)} ${formatTime(syncedAt, timeFormat)}`;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(project.projectPath)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(project.projectPath)}
      aria-label={`Open ${project.projectName}`}
      className={clsx(
        "group relative cursor-pointer overflow-hidden rounded-[24px] border bg-bg/80 p-5",
        "transition-[transform,box-shadow,border-color] duration-300",
        "hover:-translate-y-1.5 hover:rotate-[0.4deg] hover:shadow-panel active:scale-[0.99]",
        active ? "border-accent shadow-panel" : "border-border"
      )}
    >
      <CardShapes variant={0} />

      <div className="relative flex items-start justify-between gap-3">
        <SheetStack
          active={active}
          size="md"
          className="mr-1"
          icon={<DevIcon name={getTechIconName(project.stack)} />}
        />

        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-lg">
            {project.projectName}
          </CardTitle>
          <BodyText className="mt-2 truncate text-muted">
            {project.projectPath}
          </BodyText>
        </div>

        <IconButton
          icon="xmark"
          iconClassName="h-4 w-4"
          onClick={(e) => { e.stopPropagation(); onRemove(project.projectPath); }}
          aria-label={`Remove ${project.projectName}`}
          className="h-9 w-9 rounded-full border border-border bg-soft text-muted hover:border-red-300/40 hover:text-red-400"
        />
      </div>

      <div className="relative mt-4 flex w-full flex-wrap gap-2 text-left">
        <PillText as="span" className="rounded-full border border-border bg-soft px-3 py-1.5 text-accent">
          {formatStackLabel(project.stack)}
        </PillText>
        {project.metaFramework ? (
          <PillText as="span" className="rounded-full border border-border bg-soft px-3 py-1.5 text-muted">
            {formatStackLabel(project.metaFramework)}
          </PillText>
        ) : null}
        <PillText as="span" className="rounded-full border border-border bg-soft px-3 py-1.5 text-muted">
          {formatStackLabel(project.packageManager)}
        </PillText>
      </div>

      <div className="relative mt-5 flex flex-col items-end gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PillText className="text-right text-muted sm:text-left">
          Last synced {formattedSyncedAt}
        </PillText>

        <button
          type="button"
          disabled={syncing}
          onClick={(e) => { e.stopPropagation(); onResync(project.projectPath); }}
          className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-border bg-soft px-4 py-2 text-sm font-semibold text-text hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          <UiIcon
            name="refresh-circle"
            className={syncing ? "h-4 w-4 animate-spin" : "h-4 w-4"}
          />
          Resync
        </button>
      </div>
    </article>
  );
}
