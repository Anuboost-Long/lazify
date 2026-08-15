import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { Task } from "@main/tasks/types";
import { translation } from "@renderer/i18n/translation";
import { SmallText } from "@renderer/shared/typography";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { StatusToggle, TaskChip, priorityRule } from "./task-visuals";

interface TaskRowProps {
  task: Task;
  selected?: boolean;
  onSelect?: () => void;
  onCycleStatus: () => void;
  /** Hands the task's prompt to the agent on screen. Absent where none is. */
  onSendPrompt?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

/** Overdue is worth colouring; a date on its own is not. */
function overdue(deadline: string, done: boolean): boolean {
  return !done && new Date(deadline) < new Date(new Date().toDateString());
}

/** The same card as the home page's, narrowed for the rail it lives in. */
export function TaskRow({
  task,
  selected = false,
  onSelect,
  onCycleStatus,
  onSendPrompt,
  onEdit,
  onDelete
}: Readonly<TaskRowProps>) {
  const { t } = useTranslation();
  const done = task.status === "done";

  return (
    <div
      className={clsx(
        "group relative flex items-start gap-2 overflow-hidden rounded-lg border bg-soft",
        "py-2 pl-3 pr-1.5",
        done && "opacity-60",
        selected ? "border-accent/50 bg-accent/[0.06]" : "border-border hover:border-accent/40"
      )}
    >
      <span
        aria-hidden
        className={clsx("absolute inset-y-0 left-0 w-[3px]", priorityRule[task.priority])}
      />

      <div className="mt-0.5">
        <StatusToggle status={task.status} onCycle={onCycleStatus} compact />
      </div>

      <div className="min-w-0 flex-1">
        <button type="button" onClick={onSelect} className="block w-full text-left">
          <SmallText
            className={clsx(
              "block truncate font-semibold",
              selected ? "!text-accent" : "!text-text",
              done && "line-through"
            )}
          >
            {task.name}
          </SmallText>
        </button>

        <div className="mt-1 flex flex-wrap items-center gap-1">
          {task.status === "doing" ? (
            <TaskChip icon="play" tone="accent">
              {t(translation.Tasks.StatusDoing)}
            </TaskChip>
          ) : null}

          {task.requirements.length > 0 ? (
            <TaskChip icon="check-circle">
              {t(translation.Tasks.RequirementCount, { count: task.requirements.length })}
            </TaskChip>
          ) : null}

          {task.deadline ? (
            <TaskChip tone={overdue(task.deadline, done) ? "error" : "muted"}>
              {task.deadline}
            </TaskChip>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
        {onSendPrompt ? (
          <Tooltip content={t(translation.Tasks.SendPrompt)} side="left">
            <button
              type="button"
              onClick={onSendPrompt}
              aria-label={t(translation.Tasks.SendPrompt)}
              className="rounded p-1 text-muted hover:text-accent"
            >
              <UiIcon name="sparks" className="h-3 w-3" />
            </button>
          </Tooltip>
        ) : null}

        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            aria-label={t(translation.GlobalTerm.Rename)}
            className="rounded p-1 text-muted hover:text-text"
          >
            <UiIcon name="edit" className="h-3 w-3" />
          </button>
        ) : null}

        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            aria-label={t(translation.GlobalTerm.Delete)}
            className="rounded p-1 text-muted hover:text-error"
          >
            <UiIcon name="trash" className="h-3 w-3" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
