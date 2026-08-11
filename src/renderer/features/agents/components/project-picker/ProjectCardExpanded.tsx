import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { formatStackLabel } from "@renderer/features/workspace/utils/stack-label";
import { getTechIconName } from "@renderer/shared/lib/icon-map";
import { CaptionText, CardTitle, PillText } from "@renderer/shared/typography";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import { CardShapes } from "@renderer/shared/ui/card/CardShapes";
import { SheetStack } from "@renderer/shared/ui/card/SheetStack";
import DevIcon from "@renderer/shared/ui/icons/DevIcon";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
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

return (
  <div
    role="button"
    tabIndex={0}
    {...dragProps}
    onClick={() => onSelect(project.projectPath)}
    onKeyDown={(event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onSelect(project.projectPath);
    }}
    style={{ animationDelay: `${index * 45}ms` }}
    className={clsx(
      "group animate-fadeIn relative flex w-full flex-col gap-2.5 overflow-hidden",
      "rounded-[20px] border p-3 text-left",
      "transition-[transform,box-shadow,border-color] duration-300",
      "hover:-translate-y-1 hover:shadow-panel active:scale-[0.98]",
      "cursor-grab active:cursor-grabbing",
      isDragging && "opacity-40",
      active
        ? "border-accent bg-bg shadow-panel"
        : "border-border bg-bg/80 hover:border-accent/40"
    )}
  >

    {dropLine}

    <CardShapes variant={(index % 3) as 0 | 1 | 2} />

    <div className="relative flex items-start gap-2.5">
      <SheetStack active={active} icon={<DevIcon name={getTechIconName(project.stack)} />} />

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          <CardTitle className="min-w-0 flex-1 truncate text-sm">
            {project.projectName}
          </CardTitle>

          {waiting > 0 ? (
            <span
              title={t(translation.Agents.NeedsAttention)}
              className={clsx(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                "animate-pulse border-accent/40 bg-accent/15 text-accent"
              )}
            >
              <UiIcon name="bell" className="h-3 w-3" />
            </span>
          ) : null}
        </div>

        <CaptionText
          tone="muted"
          className="mt-0.5 line-clamp-2 !text-[10px] leading-[14px] break-all"
        >
          {project.projectPath}
        </CaptionText>
      </div>
    </div>

    <div className="relative flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <PillText
          as="span"
          className={clsx(
            "shrink-0 rounded-full border px-2 py-0.5",
            active
              ? "border-accent/30 bg-accent/10 text-accent"
              : "border-border bg-soft text-muted"
          )}
        >
          {formatStackLabel(project.stack)}
        </PillText>

        <CaptionText tone="muted" className="truncate">
          {running > 0
            ? `${running} ${t(translation.Agents.Running)}`
            : t(translation.Agents.Idle)}
        </CaptionText>
      </div>

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
              className={clsx(
                "flex h-6 shrink-0 items-center gap-1 rounded-full px-2",

                "bg-rose-500 text-white transition-colors hover:bg-rose-400"
              )}
            >
              <UiIcon name="xmark" className="h-3 w-3" />

              <span className="text-[10px] font-semibold leading-none">
                {tabCount}
              </span>
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
    </div>
  </div>
);
}
