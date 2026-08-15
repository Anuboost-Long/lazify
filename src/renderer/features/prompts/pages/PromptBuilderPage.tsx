import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { SegmentedTabs, type SegmentedTab } from "@renderer/shared/ui/SegmentedTabs";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import { promptBuilderTool } from "../../tools/catalog";
import { ToolPageHeader } from "../../tools/components/ToolPageHeader";
import { ContextPanel } from "../components/ContextPanel";
import { PresetManagerPanel } from "../components/PresetManagerPanel";

interface PromptBuilderPageProps {
  projects: SyncedWorkspaceProject[];
  activeProjectPath: string | null;
  onActiveProjectChange: (projectPath: string) => void;
}

type PageTab = "presets" | "context";

const TABS: SegmentedTab<PageTab>[] = [
  { id: "presets", label: translation.PromptBuilder.Presets, icon: "journal-page" },
  { id: "context", label: translation.PromptBuilder.ContextTitle, icon: "database" }
];

/**
 * How a task becomes instructions.
 *
 * The tasks themselves live where the work is — beside the agents and on each
 * project — and this is the machinery behind them: the templates that shape a
 * prompt, and the context every prompt carries. Nothing here calls a model.
 */
export function PromptBuilderPage({
  projects,
  activeProjectPath,
  onActiveProjectChange
}: Readonly<PromptBuilderPageProps>) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<PageTab>("presets");

  const projectPath = activeProjectPath ?? projects[0]?.projectPath ?? "";

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <ToolPageHeader tool={promptBuilderTool}>
        <SegmentedTabs tabs={TABS} active={tab} onSelect={setTab} />
      </ToolPageHeader>

      {tab === "presets" ? (
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-soft">
          <PresetManagerPanel />
        </div>
      ) : (
        <ContextPanel
          projectPath={projectPath}
          projects={projects}
          onProjectChange={onActiveProjectChange}
        />
      )}
    </div>
  );
}
