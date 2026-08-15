import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { Task } from "@main/tasks/types";
import { translation } from "@renderer/i18n/translation";
import {
  StatusToggle,
  TaskChip,
  priorityRule
} from "@renderer/features/tasks/components/task-visuals";
import { BodyText } from "@renderer/shared/typography";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface HomeTaskRowProps {
  task: Task;
  projectName: string;
  onOpen: () => void;
  onCycleStatus: () => void;
  onSendPrompt: () => void;
  onOpenAgents: () => void;
  onDelete: () => void;
}

/**
 * One task, as a thing rather than a line.
 *
 * The card carries its own edge, and the rule down it is the priority — so a
 * list is scanned by colour and shape before a word of it is read. What used to
 * be muted text after the title is now chips: the project it belongs to, where
 * it has got to, and when it is due.
 */
export function HomeTaskRow({
  task,
  projectName,
  onOpen,
  onCycleStatus,
  onSendPrompt,
  onOpenAgents,
  onDelete
}: Readonly<HomeTaskRowProps>) {
  const { t } = useTranslation();
  const done = task.status === "done";
  const overdue =
    task.deadline && !done && new Date(task.deadline) < new Date(new Date().toDateString());

  return (
    <div
      className={clsx(
        "group relative flex items-center gap-3 overflow-hidden rounded-xl border bg-soft",
        "py-3 pl-4 pr-2 transition-transform duration-150",
        done
          ? "border-border/60 opacity-60"
          : "border-border hover:-translate-y-px hover:border-accent/40 hover:shadow-panel"
      )}
    >
      <span
        aria-hidden
        className={clsx("absolute inset-y-0 left-0 w-1", priorityRule[task.priority])}
      />

      <StatusToggle status={task.status} onCycle={onCycleStatus} />

      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <BodyText
          className={clsx("!text-text block truncate font-semibold", done && "line-through")}
        >
          {task.name}
        </BodyText>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <TaskChip icon="folder">{projectName}</TaskChip>

          {task.status === "doing" ? (
            <TaskChip icon="play" tone="accent">
              {t(translation.Tasks.StatusDoing)}
            </TaskChip>
          ) : null}

          {task.deadline ? (
            <TaskChip tone={overdue ? "error" : "muted"}>{task.deadline}</TaskChip>
          ) : null}

          {task.requirements.length > 0 ? (
            <TaskChip icon="check-circle">
              {t(translation.Tasks.RequirementCount, { count: task.requirements.length })}
            </TaskChip>
          ) : null}
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Tooltip content={t(translation.Tasks.SendPrompt)} side="left">
          <button
            type="button"
            onClick={onSendPrompt}
            aria-label={t(translation.Tasks.SendPrompt)}
            className={clsx(
              "flex h-8 w-8 items-center justify-center rounded-lg border border-border",
              "text-muted transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
            )}
          >
            <UiIcon name="sparks" className="h-3.5 w-3.5" />
          </button>
        </Tooltip>

        <Tooltip content={t(translation.Home.OpenInAgents)} side="left">
          <button
            type="button"
            onClick={onOpenAgents}
            aria-label={t(translation.Home.OpenInAgents)}
            className={clsx(
              "flex h-8 w-8 items-center justify-center rounded-lg border border-border",
              "text-muted transition-colors hover:border-accent/40 hover:text-accent"
            )}
          >
            <UiIcon name="code" className="h-3.5 w-3.5" />
          </button>
        </Tooltip>

        <Tooltip content={t(translation.Tasks.DeleteTask)} side="left">
          <button
            type="button"
            onClick={onDelete}
            aria-label={t(translation.Tasks.DeleteTask)}
            className={clsx(
              "flex h-8 w-8 items-center justify-center rounded-lg border border-border",
              "text-muted transition-colors hover:border-error/40 hover:bg-error/10 hover:text-error"
            )}
          >
            <UiIcon name="trash" className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
