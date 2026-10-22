import clsx from "clsx";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";

import type { ToolDefinition } from "@/features/tools/catalog";
import { translation } from "@/i18n/translation";
import { OverlineText } from "@/shared/typography";
import { Tooltip } from "@/shared/ui/Tooltip";
import UiIcon from "@/shared/ui/icons/UiIcon";

interface SidebarPinnedToolsProps {
  tools: ToolDefinition[];
  activePath: string;
  collapsed: boolean;
  onNavigate: (path: string) => void;
}

export function SidebarPinnedTools({
  tools,
  activePath,
  collapsed,
  onNavigate
}: Readonly<SidebarPinnedToolsProps>) {
  const { t } = useTranslation();

  if (tools.length === 0) return null;

  return (
    <section
      aria-label={t(translation.Tools.PinnedTools)}
      className={clsx("mt-4", collapsed ? "flex flex-col gap-1" : "px-1")}
    >
      {collapsed ? null : (
        <OverlineText className="mb-2 block px-2 text-muted">
          {t(translation.Tools.PinnedTools)}
        </OverlineText>
      )}

      <div
        className={clsx(
          collapsed ? "flex flex-col gap-1" : "grid grid-cols-4 gap-1.5"
        )}
      >
        {tools.map((tool) => {
          const active = activePath === tool.path;

          return (
            <Tooltip key={tool.id} content={t(tool.label)} side="right">
              <button
                type="button"
                aria-label={t(tool.label)}
                onClick={() => onNavigate(tool.path)}
                style={{ "--pinned-tool": tool.color } as CSSProperties}
                className={clsx(
                  "group flex aspect-square items-center justify-center rounded-xl",
                  "text-(--pinned-tool)",
                  "transition duration-300 ease-spring active:scale-90 active:duration-75 active:ease-out motion-reduce:transition-none motion-reduce:active:scale-100",
                  active ? "bg-bg" : "hover:bg-bg/70 active:bg-bg"
                )}
              >
                <UiIcon
                  name={tool.icon}
                  filled={active}
                  className={clsx(
                    "h-5 w-5",
                    "transition-transform duration-300 ease-spring group-active:scale-85 group-active:duration-75 group-active:ease-out motion-reduce:transition-none motion-reduce:group-active:scale-100"
                  )}
                />
              </button>
            </Tooltip>
          );
        })}
      </div>
    </section>
  );
}
