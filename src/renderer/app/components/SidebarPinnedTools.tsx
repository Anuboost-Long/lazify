import clsx from "clsx";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";

import type { ToolDefinition } from "@renderer/features/tools/catalog";
import { translation } from "@renderer/i18n/translation";
import { OverlineText } from "@renderer/shared/typography";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

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
                  "flex aspect-square items-center justify-center rounded-xl",
                  "text-[var(--pinned-tool)] transition-colors",
                  active ? "bg-bg" : "hover:bg-bg/70"
                )}
              >
                <UiIcon name={tool.icon} filled={active} className="h-5 w-5" />
              </button>
            </Tooltip>
          );
        })}
      </div>
    </section>
  );
}
