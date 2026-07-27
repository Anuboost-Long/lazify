import clsx from "clsx";
import { translation } from "@renderer/i18n/translation";
import { OverlineText, PillText } from "@renderer/shared/typography";
import type { DetectedTool, ToolCategory } from "@renderer/shared/types/lazify";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";
import { ToolCard } from "./ToolCard";
import { useTranslation } from "react-i18next";

interface CategorySectionProps {
  category: ToolCategory;
  tools: DetectedTool[];
  loadingTool: string | null;
  onNvmAction: () => void;
  onInstall: (tool: DetectedTool) => void;
  onUpdate: (tool: DetectedTool) => void;
  /** Only ever passed for tools that report an uninstall command. */
  onUninstall: (tool: DetectedTool) => void;
}

const categoryLabels: Record<ToolCategory, string> = {
  agents: translation.Environment.CategoryAgents,
  nodejs: translation.Environment.CategoryNode,
  python: translation.Environment.CategoryPython,
  dotnet: translation.Environment.CategoryDotnet,
  system: translation.Environment.CategorySystem,
};

const categoryIcons: Record<ToolCategory, UiIconName> = {
  agents: "terminal",
  nodejs: "package",
  python: "code",
  dotnet: "database",
  system: "settings",
};

export function CategorySection({ category, tools, loadingTool, onNvmAction, onInstall, onUpdate, onUninstall }: CategorySectionProps) {
  const { t } = useTranslation();
  const availableCount = tools.filter((tool) => tool.available).length;

  const complete = availableCount === tools.length;

  return (
    <section className="group/section flex flex-col gap-4">
      {/* Divider, built from the card-artwork vocabulary rather than a border:
          an accent capsule that starts the group, a couple of grid marks, then
          a perforated line that runs out and fades. It reads as a measure on a
          drafting sheet — the group starts *here* and extends that way. */}
      <div aria-hidden="true" className="flex items-center gap-1.5">
        <span className="h-[3px] w-9 shrink-0 rounded-full bg-accent opacity-70 transition-[width,opacity] duration-300 group-hover/section:w-12 group-hover/section:opacity-100" />
        <span className="h-[3px] w-[3px] shrink-0 rounded-full bg-accent opacity-50" />
        <span className="h-[3px] w-[3px] shrink-0 rounded-full bg-accent opacity-30" />
        <span
          className={clsx(
            "h-px flex-1 rounded-full",
            "bg-[repeating-linear-gradient(to_right,var(--color-border)_0_5px,transparent_5px_11px)]",
            "[mask-image:linear-gradient(to_right,black,black_55%,transparent)]",
          )}
        />
      </div>

      {/* Not a panel. The group is held together by that divider and a
          masthead, so the cards are the only boxes on the screen and the
          page's own backdrop shows through between them. */}
      <header className="flex items-center gap-3">
        {/* The category mark keeps its full-height-tile shape, but the height
            it fills is the label's rather than a container's. */}
        <span
          className={clsx(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px]",
            "bg-accent/10 text-accent",
            "transition-colors duration-300 group-hover/section:bg-accent/[0.18]",
          )}
        >
          <UiIcon name={categoryIcons[category]} className="h-4 w-4" />
        </span>

        <OverlineText className="min-w-0 flex-1 truncate text-accent">
          {t(categoryLabels[category])}
        </OverlineText>

        {/* Coverage meter: the group's headline number, readable before you
            read anything. Full and accent means nothing is missing here. */}
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-border sm:block">
            <span
              className={clsx(
                "block h-full rounded-full transition-[width] duration-500",
                complete ? "bg-accent" : "bg-warning",
              )}
              style={{
                width: `${tools.length ? (availableCount / tools.length) * 100 : 0}%`,
              }}
            />
          </span>

          <PillText
            as="span"
            className={clsx(
              "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-[0.1em]",
              complete
                ? "border-accent/25 bg-accent/10 !text-accent"
                : "border-border bg-soft !text-muted",
            )}
          >
            {availableCount}/{tools.length}
          </PillText>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => {
          const isNodeEntry = tool.name === "node";
          const canInstall = !tool.available && !!tool.installCommand;
          const canUpdate = tool.available && !!tool.updateCommand && !isNodeEntry;
          const canUninstall = tool.available && !!tool.uninstallCommand;

          return (
            <ToolCard
              key={tool.name}
              tool={tool}
              loading={loadingTool === tool.name}
              onSecondaryAction={canUninstall ? () => onUninstall(tool) : undefined}
              secondaryActionLabel={t(translation.GlobalTerm.Uninstall)}
              onAction={
                isNodeEntry ? onNvmAction :
                canUpdate ? () => onUpdate(tool) :
                canInstall ? () => onInstall(tool) :
                undefined
              }
              actionLabel={
                isNodeEntry ? t(translation.GlobalTerm.Versions) :
                canUpdate ? t(translation.Environment.Check) :
                canInstall ? t(translation.GlobalTerm.Install) :
                undefined
              }
            />
          );
        })}
      </div>
    </section>
  );
}
