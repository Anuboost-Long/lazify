import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { translation } from "@renderer/i18n/translation";
import { CaptionText, CardTitle } from "@renderer/shared/typography";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { PageHero } from "@renderer/shared/ui/PageHero";
import { availableTools } from "../catalog";
import { usePinnedTools } from "../hooks/use-pinned-tools";
import { toolColorVars } from "../lib/tool-colors";

/**
 * The app drawer for tools.
 *
 * Everything here is a self-contained job that is not part of the day-to-day
 * flow — the drawer stays short, and a tool arrives as a tile rather than a
 * permanent entry nobody uses twice unless it earns a pinned shortcut. Each
 * tile is washed in the tool's own colour, so the grid is found by hue rather
 * than read line by line.
 */
export function ToolsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const tools = availableTools(globalThis.lazify?.platform ?? "");
  const { pinnedToolIds, togglePinnedTool } = usePinnedTools();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
      <PageHero
        eyebrow={translation.Tools.Eyebrow}
        title={translation.Tools.Title}
        description={translation.Tools.Subtitle}
      />

      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
        {tools.map((tool) => {
          const pinned = pinnedToolIds.includes(tool.id);

          return (
            <article
              key={tool.id}
              style={toolColorVars(tool)}
              className={clsx(
                "group relative overflow-hidden rounded-2xl border",
                "border-[var(--tool-border)] bg-[var(--tool-tile)]",
                "transition-all duration-200",
                "hover:-translate-y-0.5 hover:border-[var(--tool)] hover:shadow-lg",
                "active:scale-[0.99]"
              )}
            >
              <button
                type="button"
                onClick={() => navigate(tool.path)}
                className="flex h-full w-full flex-col items-start gap-3 p-4 text-left"
              >
                <span
                  className={clsx(
                    "flex h-12 w-12 items-center justify-center rounded-2xl",
                    "bg-[var(--tool-icon)] text-[var(--tool)]"
                  )}
                >
                  <UiIcon name={tool.icon} className="h-6 w-6" />
                </span>

                <div className="min-w-0 pr-7">
                  <CardTitle className="!text-text block truncate">
                    {t(tool.label)}
                  </CardTitle>
                  <CaptionText tone="muted" className="mt-1 block leading-5">
                    {t(tool.description)}
                  </CaptionText>
                </div>
              </button>

              <Tooltip
                content={t(
                  pinned
                    ? translation.Tools.UnpinFromDrawer
                    : translation.Tools.PinToDrawer,
                  { tool: t(tool.label) }
                )}
                side="left"
              >
                <button
                  type="button"
                  aria-pressed={pinned}
                  aria-label={t(
                    pinned
                      ? translation.Tools.UnpinFromDrawer
                      : translation.Tools.PinToDrawer,
                    { tool: t(tool.label) }
                  )}
                  onClick={() => togglePinnedTool(tool.id)}
                  className={clsx(
                    "absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg",
                    "transition-colors",
                    pinned
                      ? "bg-[var(--tool-icon)] text-[var(--tool)]"
                      : "bg-bg/70 text-muted hover:text-[var(--tool)]"
                  )}
                >
                  <UiIcon
                    name="pin"
                    filled={pinned}
                    className="h-4 w-4"
                  />
                </button>
              </Tooltip>
            </article>
          );
        })}
      </div>
    </div>
  );
}
