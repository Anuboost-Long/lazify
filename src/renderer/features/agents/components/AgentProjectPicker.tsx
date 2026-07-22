import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { formatStackLabel } from "@renderer/features/workspace/components/synced-project-item/utils";
import { getTechIconName } from "@renderer/shared/lib/icon-map";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import { CaptionText, CardTitle, OverlineText, PillText } from "@renderer/shared/typography";
import { CardShapes } from "@renderer/shared/ui/card/CardShapes";
import { SheetStack } from "@renderer/shared/ui/card/SheetStack";
import DevIcon from "@renderer/shared/ui/icons/DevIcon";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

/**
 * Project rail for the agents page.
 *
 * A vertical list that scrolls on its own, so browsing projects never moves the
 * terminal beside it. Cards follow the playful-doc-console direction: document
 * artwork, a status pill, and an action affordance.
 */

interface AgentProjectPickerProps {
  projects: SyncedWorkspaceProject[];
  selectedPath: string;
  /** Open terminals per project path, shown as card status. */
  runningCounts: Record<string, number>;
  onSelect: (projectPath: string) => void;
}

export function AgentProjectPicker({
  projects,
  selectedPath,
  runningCounts,
  onSelect,
}: Readonly<AgentProjectPickerProps>) {
  const { t } = useTranslation();

  return (
    <aside
      className={clsx(
        "flex min-h-0 w-full flex-col rounded-[24px] border border-border bg-soft",
        "lg:w-[300px] lg:shrink-0"
      )}
    >
      <div className="shrink-0 px-4 pb-2 pt-4">
        <OverlineText className="text-accent">{t(translation.Agents.Projects)}</OverlineText>
      </div>

      {/* Only this rail scrolls — the terminal beside it stays put. */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {projects.map((project, index) => {
          const active = project.projectPath === selectedPath;
          const running = runningCounts[project.projectPath] ?? 0;

          return (
            <button
              key={project.projectPath}
              type="button"
              onClick={() => onSelect(project.projectPath)}
              style={{ animationDelay: `${index * 45}ms` }}
              className={clsx(
                "group animate-fadeIn relative flex w-full flex-col gap-2.5 overflow-hidden",
                "rounded-[20px] border p-3 text-left",
                "transition-[transform,box-shadow,border-color] duration-300",
                "hover:-translate-y-1 hover:shadow-panel active:scale-[0.98]",
                active
                  ? "border-accent bg-bg shadow-panel"
                  : "border-border bg-bg/80 hover:border-accent/40"
              )}
            >
              <CardShapes variant={(index % 3) as 0 | 1 | 2} />

              <div className="relative flex items-start gap-2.5">
                <SheetStack
                  active={active}
                  icon={<DevIcon name={getTechIconName(project.stack)} />}
                />

                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate text-sm">{project.projectName}</CardTitle>
                  {/* Paths have no spaces, so break anywhere; two lines, then ellipsis. */}
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
            </button>
          );
        })}
      </div>
    </aside>
  );
}
