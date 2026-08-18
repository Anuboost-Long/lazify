import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import { ProjectPickerList } from "./ProjectPickerList";
import { ProjectSyncButton } from "./ProjectSyncButton";

interface ProjectPickerPanelProps {
  projects: SyncedWorkspaceProject[];
  selectedPath?: string;
  emptyMessage?: string;
  inset?: boolean;
  className?: string;
  onSelect: (project: SyncedWorkspaceProject) => void;
}

export function ProjectPickerPanel({
  projects,
  selectedPath,
  emptyMessage,
  inset = false,
  className,
  onSelect
}: Readonly<ProjectPickerPanelProps>) {
  const { t } = useTranslation();
  const { syncWorkspaceProject, setActiveProjectPath } = useLazifyStore();
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const syncProject = async () => {
    try {
      setSyncError(null);
      setSyncing(true);
      const project = await syncWorkspaceProject();
      if (project) {
        setActiveProjectPath(project.projectPath);
        onSelect(project);
      }
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : t(translation.Workspace.SyncError)
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className={clsx("flex min-h-0 flex-1 flex-col", className)}>
      <div
        className={clsx(
          "min-h-0 flex-1 space-y-2 overflow-y-auto py-2",
          inset && "px-6"
        )}
      >
        <ProjectPickerList
          projects={projects}
          selectedPath={selectedPath}
          emptyMessage={emptyMessage}
          onSelect={onSelect}
        />
      </div>

      <footer
        className={clsx("shrink-0 border-t border-border py-3", inset && "px-6")}
      >
        <ProjectSyncButton syncing={syncing} onClick={() => void syncProject()} />
        {syncError ? (
          <p className="mt-2 px-1 text-xs leading-5 text-error">{syncError}</p>
        ) : null}
      </footer>
    </div>
  );
}
