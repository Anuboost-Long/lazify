import clsx from "clsx";
import type { DetectedTool, ToolCategory } from "@renderer/shared/types/lazify";
import { ToolCard } from "./ToolCard";

interface CategorySectionProps {
  category: ToolCategory;
  tools: DetectedTool[];
  loadingTool: string | null;
  onNvmAction: () => void;
  onInstall: (tool: DetectedTool) => void;
  onUpdate: (tool: DetectedTool) => void;
}

const categoryLabels: Record<ToolCategory, string> = {
  nodejs: "JavaScript & Node.js",
  python: "Python",
  dotnet: ".NET",
  system: "System Tools",
};

export function CategorySection({ category, tools, loadingTool, onNvmAction, onInstall, onUpdate }: CategorySectionProps) {
  return (
    <section className={clsx("rounded-shell border border-border bg-soft p-5", "shadow-panel")}>
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
        {categoryLabels[category]}
      </p>
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
                isNodeEntry ? "Versions" :
                canUpdate ? "Check" :
                canInstall ? "Install" :
                undefined
              }
            />
          );
        })}
      </div>
    </section>
  );
}
