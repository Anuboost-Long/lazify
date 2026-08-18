import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { Task } from "@main/tasks/types";
import { translation } from "@renderer/i18n/translation";
import { CaptionText, SectionTitle } from "@renderer/shared/typography";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";

interface TaskStatTilesProps {
  tasks: Task[];
}

interface Tile {
  id: string;
  label: string;
  icon: UiIconName;
  count: number;
  tone: string;
}

/** Overdue means a deadline in the past on something still open. */
function isOverdue(task: Task): boolean {
  if (!task.deadline || task.status === "done") return false;
  return new Date(task.deadline) < new Date(new Date().toDateString());
}

export function TaskStatTiles({ tasks }: Readonly<TaskStatTilesProps>) {
  const { t } = useTranslation();
  const done = tasks.filter((task) => task.status === "done").length;
  const completion = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100);

  const tiles: Tile[] = [
    {
      id: "doing",
      label: translation.Tasks.StatusDoing,
      icon: "play",
      count: tasks.filter((task) => task.status === "doing").length,
      tone: "text-accent"
    },
    {
      id: "todo",
      label: translation.Tasks.StatusTodo,
      icon: "journal-page",
      count: tasks.filter((task) => task.status === "todo").length,
      tone: "text-text"
    },
    {
      id: "overdue",
      label: translation.Home.Overdue,
      icon: "warning-triangle",
      count: tasks.filter(isOverdue).length,
      tone: "text-error"
    }
  ];

  return (
    <div className="grid gap-6 border-t border-border pt-6 lg:grid-cols-[auto_1fr] lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
      <div className="flex items-center gap-4">
        <div
          role="img"
          aria-label={`${completion}% ${t(translation.Tasks.StatusDone)}`}
          style={{
            background: `conic-gradient(rgb(var(--color-accent)) ${completion}%, rgb(var(--color-text) / 0.08) 0)`
          }}
          className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
        >
          <div className="absolute inset-[7px] rounded-full bg-soft" />
          <div className="relative text-center">
            <SectionTitle className="!text-2xl">{completion}%</SectionTitle>
            <CaptionText tone="muted">{t(translation.Tasks.StatusDone)}</CaptionText>
          </div>
        </div>

        <div className="min-w-0 lg:hidden xl:block">
          <CaptionText tone="muted">{t(translation.Home.YourTasks)}</CaptionText>
          <p className="mt-1 text-sm font-semibold text-text">
            {done} / {tasks.length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-border">
        {tiles.map((tile) => (
          <div
            key={tile.id}
            className="flex min-w-0 flex-col justify-center px-4 first:pl-0 last:pr-0"
          >
            <div className={clsx("flex items-center gap-2", tile.tone)}>
              <UiIcon name={tile.icon} filled={tile.count > 0} className="h-4 w-4 shrink-0" />
              <span className="text-2xl font-semibold tabular-nums">{tile.count}</span>
            </div>
            <CaptionText tone="muted" className="mt-1 truncate">
              {t(tile.label)}
            </CaptionText>
          </div>
        ))}
      </div>
    </div>
  );
}
