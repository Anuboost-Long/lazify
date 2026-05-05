import clsx from "clsx";
import { BodyText, CardTitle, PillText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import { formatStackLabel, formatSyncedAt } from "./utils";

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
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(project.projectPath)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(project.projectPath)}
      aria-label={`Open ${project.projectName}`}
      className={clsx(
        "cursor-pointer overflow-hidden rounded-[24px] border bg-bg/80 p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-panel",
        active ? "border-accent shadow-panel" : "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-lg">
            {project.projectName}
          </CardTitle>
          <BodyText className="mt-2 truncate text-muted">
            {project.projectPath}
          </BodyText>
        </div>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(project.projectPath); }}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-soft text-muted hover:border-red-300/40 hover:text-red-400"
          aria-label={`Remove ${project.projectName}`}
        >
          <UiIcon name="xmark" className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex w-full flex-wrap gap-2 text-left">
        <PillText as="span" className="rounded-full border border-border bg-soft px-3 py-1.5 text-accent">
          {formatStackLabel(project.stack)}
        </PillText>
        <PillText as="span" className="rounded-full border border-border bg-soft px-3 py-1.5 text-muted">
          {formatStackLabel(project.metaFramework)}
        </PillText>
        <PillText as="span" className="rounded-full border border-border bg-soft px-3 py-1.5 text-muted">
          {formatStackLabel(project.packageManager)}
        </PillText>
      </div>

      <div className="mt-5 flex flex-col items-end gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PillText className="text-right text-muted sm:text-left">
          Last synced {formatSyncedAt(project.lastSyncedAt)}
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
