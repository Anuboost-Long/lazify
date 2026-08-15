import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { Task } from "@main/tasks/types";
import { translation } from "@renderer/i18n/translation";
import { CaptionText, PageTitle } from "@renderer/shared/typography";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";

interface TaskStatTilesProps {
  tasks: Task[];
}

interface Tile {
  id: string;
  label: string;
  icon: UiIconName;
  count: number;
  /** The tile's own hue, dimmed when it has nothing to report. */
  color: string;
}

/** Overdue means a deadline in the past on something still open. */
function isOverdue(task: Task): boolean {
  if (!task.deadline || task.status === "done") return false;
  return new Date(task.deadline) < new Date(new Date().toDateString());
}

export function TaskStatTiles({ tasks }: Readonly<TaskStatTilesProps>) {
  const { t } = useTranslation();

  const tiles: Tile[] = [
    {
      id: "doing",
      label: translation.Tasks.StatusDoing,
      icon: "play",
      count: tasks.filter((task) => task.status === "doing").length,
      color: "#7c5cff"
    },
    {
      id: "todo",
      label: translation.Tasks.StatusTodo,
      icon: "journal-page",
      count: tasks.filter((task) => task.status === "todo").length,
      color: "#00b8a9"
    },
    {
      id: "overdue",
      label: translation.Home.Overdue,
      icon: "warning-triangle",
      count: tasks.filter(isOverdue).length,
      color: "#ef5f5f"
    },
    {
      id: "done",
      label: translation.Tasks.StatusDone,
      icon: "check-circle",
      count: tasks.filter((task) => task.status === "done").length,
      color: "#8a94a6"
    }
  ];

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
      {tiles.map((tile) => {
        const empty = tile.count === 0;

        return (
          <div
            key={tile.id}
            style={{
              backgroundColor: `${tile.color}${empty ? "0d" : "1a"}`,
              borderColor: `${tile.color}${empty ? "22" : "40"}`
            }}
            className="flex items-center gap-4 rounded-2xl border px-5 py-4"
          >
            <span
              style={{ backgroundColor: `${tile.color}26`, color: tile.color }}
              className={clsx("flex h-11 w-11 items-center justify-center rounded-2xl", empty && "opacity-60")}
            >
              <UiIcon name={tile.icon} filled={!empty} className="h-5 w-5" />
            </span>

            <div className="min-w-0">
              <PageTitle className={clsx("!text-2xl", empty && "!text-muted")}>
                {tile.count}
              </PageTitle>
              <CaptionText tone="muted" className="block truncate">
                {t(tile.label)}
              </CaptionText>
            </div>
          </div>
        );
      })}
    </div>
  );
}
