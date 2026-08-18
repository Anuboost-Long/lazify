import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { CaptionText } from "@renderer/shared/typography";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { ProjectPickerItem } from "@renderer/shared/ui/project-picker/ProjectPickerItem";
import type { CardShellProps } from "./types";

export function ProjectCardExpanded({
  project,
  index,
  active,
  running,
  waiting,
  tabCount,
  isDragging,
  onSelect,
  onCloseAll,
  dragProps,
  dropLine,
}: Readonly<CardShellProps>) {
  const { t } = useTranslation();
  const action = (
    <div className="flex shrink-0 items-center gap-1.5">
      {tabCount > 0 ? (
        <Tooltip content={t(translation.Agents.CloseProjectTabs)} side="top">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onCloseAll(project.projectPath);
            }}
            aria-label={t(translation.Agents.CloseProjectTabs)}
            className="flex h-6 shrink-0 items-center gap-1 rounded-full bg-rose-500 px-2 text-white transition-colors hover:bg-rose-400"
          >
            <UiIcon name="xmark" className="h-3 w-3" />
            <span className="text-[10px] font-semibold leading-none">{tabCount}</span>
          </button>
        </Tooltip>
      ) : null}
      <span
        className={clsx(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
          "transition-transform duration-300 group-hover:translate-x-0.5",
          active ? "border-accent/50 text-accent" : "border-border text-muted"
        )}
      >
        <UiIcon name="arrow-right" className="h-3 w-3" />
      </span>
    </div>
  );

  return (
    <ProjectPickerItem
      project={project}
      index={index}
      active={active}
      isDragging={isDragging}
      before={dropLine}
      interactionProps={dragProps}
      onSelect={onSelect}
      titleAccessory={
        waiting > 0 ? (
            <span
              title={t(translation.Agents.NeedsAttention)}
              className={clsx(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                "animate-pulse border-accent/40 bg-accent/15 text-accent"
              )}
            >
              <UiIcon name="bell" className="h-3 w-3" />
            </span>
          ) : null
      }
      detail={
        <CaptionText tone="muted" className="truncate">
          {running > 0
            ? `${running} ${t(translation.Agents.Running)}`
            : t(translation.Agents.Idle)}
        </CaptionText>
      }
      action={action}
    />
  );
}
