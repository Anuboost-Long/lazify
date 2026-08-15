import clsx from "clsx";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { ContextEntry, ContextScope } from "@main/prompts/types";
import { translation } from "@renderer/i18n/translation";
import { CaptionText, SmallText } from "@renderer/shared/typography";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { ContextColumn } from "./ContextColumn";
import { ContextEntryModal } from "./ContextEntryModal";
import { ProjectPickerModal } from "./ProjectPickerModal";
import { useContextEntries } from "../hooks/use-context-entries";
import { usePromptPresets } from "../hooks/use-prompt-presets";

interface ContextPanelProps {
  projectPath: string;
  projects: SyncedWorkspaceProject[];
  onProjectChange: (projectPath: string) => void;
}

interface Editing {
  scope: ContextScope;
  entry: ContextEntry | null;
}

/**
 * What every prompt quietly carries, both scopes side by side.
 *
 * Global holds for every project and project describes this one; showing them
 * together is the point, since the question being answered here is always "what
 * will the agent be told" rather than "what did I file where".
 */
export function ContextPanel({
  projectPath,
  projects,
  onProjectChange
}: Readonly<ContextPanelProps>) {
  const { t } = useTranslation();
  const { presets } = usePromptPresets();
  const { entries, create, update, setActive, setPackActive, remove } =
    useContextEntries(projectPath);

  const [editing, setEditing] = useState<Editing | null>(null);
  const [pickingProject, setPickingProject] = useState(false);

  const presetNames = useMemo(
    () => Object.fromEntries(presets.map((preset) => [preset.id, preset.name])),
    [presets]
  );

  const global = entries.filter((entry) => entry.scope === "global");
  const project = entries.filter((entry) => entry.scope === "project");

  const projectName =
    projects.find((project) => project.projectPath === projectPath)?.projectName ?? "";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-3">
        <CaptionText tone="muted">{t(translation.PromptBuilder.ContextForProject)}</CaptionText>

        <button
          type="button"
          onClick={() => setPickingProject(true)}
          className={clsx(
            "group flex items-center gap-2.5 rounded-xl border border-border bg-soft py-2 pl-2.5 pr-3",
            "transition-colors hover:border-accent/40"
          )}
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/12 text-accent">
            <UiIcon name="folder" filled className="h-3.5 w-3.5" />
          </span>

          <SmallText className="!text-text max-w-[220px] truncate">
            {projectName || t(translation.Tasks.NoProject)}
          </SmallText>

          <UiIcon
            name="arrow-right"
            className="h-3 w-3 rotate-90 text-muted transition-colors group-hover:text-accent"
          />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <ContextColumn
          scope="global"
        title={t(translation.PromptBuilder.ScopeGlobal)}
        subtitle={t(translation.PromptBuilder.ScopeGlobalHint)}
        entries={global}
        presetNames={presetNames}
        onAdd={() => setEditing({ scope: "global", entry: null })}
        onEdit={(entry) => setEditing({ scope: "global", entry })}
        onToggle={(id, isActive) => void setActive(id, isActive)}
        onTogglePack={(pack, isActive) => void setPackActive("global", "", pack, isActive)}
        onDelete={(id) => void remove(id)}
      />

      <ContextColumn
        scope="project"
        title={t(translation.PromptBuilder.ScopeProject)}
        subtitle={t(translation.PromptBuilder.ScopeProjectHint)}
        entries={project}
        presetNames={presetNames}
        disabled={!projectPath}
        onAdd={() => setEditing({ scope: "project", entry: null })}
        onEdit={(entry) => setEditing({ scope: "project", entry })}
        onToggle={(id, isActive) => void setActive(id, isActive)}
        onTogglePack={(pack, isActive) =>
          void setPackActive("project", projectPath, pack, isActive)
        }
        onDelete={(id) => void remove(id)}
      />

      </div>

      <ProjectPickerModal
        open={pickingProject}
        projects={projects}
        selectedPath={projectPath}
        onSelect={onProjectChange}
        onClose={() => setPickingProject(false)}
      />

      <ContextEntryModal
        open={editing !== null}
        scope={editing?.scope ?? "project"}
        scopeKey={editing?.scope === "global" ? "" : projectPath}
        existing={editing?.entry ?? null}
        presets={presets}
        onSave={(input) => {
          if (editing?.entry) void update(editing.entry.id, input);
          else void create(input);
          setEditing(null);
        }}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
