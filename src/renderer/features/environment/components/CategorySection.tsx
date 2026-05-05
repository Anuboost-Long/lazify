import clsx from "clsx";
import { translation } from "@renderer/i18n/translation";
import { OverlineText } from "@renderer/shared/typography";
import type { DetectedTool, ToolCategory } from "@renderer/shared/types/lazify";
import { ToolCard } from "./ToolCard";
import { useTranslation } from "react-i18next";

interface CategorySectionProps {
  category: ToolCategory;
  tools: DetectedTool[];
  loadingTool: string | null;
  onNvmAction: () => void;
  onInstall: (tool: DetectedTool) => void;
  onUpdate: (tool: DetectedTool) => void;
}

const categoryLabels: Record<ToolCategory, string> = {
  nodejs: translation.Environment.CategoryNode,
  python: translation.Environment.CategoryPython,
  dotnet: translation.Environment.CategoryDotnet,
  system: translation.Environment.CategorySystem,
};

export function CategorySection({ category, tools, loadingTool, onNvmAction, onInstall, onUpdate }: CategorySectionProps) {
  const { t } = useTranslation();

  return (
    <section className={clsx("rounded-shell border border-border bg-soft p-5", "shadow-panel")}>
      <OverlineText className="text-accent">
        {t(categoryLabels[category])}
      </OverlineText>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => {
          const isNodeEntry = tool.name === "node";
          const canInstall = !tool.available && !!tool.installCommand;
          const canUpdate = tool.available && !!tool.updateCommand && !isNodeEntry;

          return (
            <ToolCard
              key={tool.name}
              tool={tool}
              loading={loadingTool === tool.name}
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
