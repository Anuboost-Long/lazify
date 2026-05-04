import { appRoute, getWorkspaceProjectRoute } from "@renderer/app/app-routes";
import { SyncedProjectItem } from "@renderer/features/workspace/components/synced-project-item/SyncedProjectItem";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import { PageHeader } from "@renderer/shared/ui/PageHeader";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { Toast } from "@renderer/shared/ui/toast/Toast";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface WorkspacePageProps {
  syncedProjects: SyncedWorkspaceProject[];
  onSyncProject: (
    projectPath?: string | null
  ) => Promise<SyncedWorkspaceProject | null>;
  onRemoveProject: (projectPath: string) => void;
}

export function WorkspacePage({
  syncedProjects,
  onSyncProject,
  onRemoveProject,
}: WorkspacePageProps) {
  const navigate = useNavigate();
  const [syncingProjectPath, setSyncingProjectPath] = useState<string | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasSyncedProjects = syncedProjects.length > 0;

  const handleSyncProject = async (projectPath?: string | null) => {
    try {
      setErrorMessage(null);
      setSyncingProjectPath(projectPath ?? "__new__");
      await onSyncProject(projectPath);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to sync the selected project."
      );
    } finally {
      setSyncingProjectPath(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Desktop Workflow Orchestrator"
        title="Workspace"
        description="Track the project folders this desktop app is allowed to read, keep their stack metadata fresh, and jump back into creation flow when you need a new scaffold."
        icon="folder"
      />

      <section className="relative overflow-hidden rounded-[30px] border border-border bg-soft p-6 shadow-panel">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(circle at top left, rgba(16, 185, 129, 0.18), transparent 38%), linear-gradient(135deg, rgba(255, 255, 255, 0.02), transparent 55%)",
          }}
        />

        <div className="relative flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                Synced projects
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-text">
                {hasSyncedProjects
                  ? "Projects available in this workspace"
                  : "No synced projects yet"}
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted">
                {hasSyncedProjects
                  ? "Each item stores the approved folder path, detected stack, and the last sync timestamp."
                  : "Sync a project folder to let the app remember its path and basic stack details for later workspace access."}
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-3 self-end lg:max-w-sm">
              <button
                type="button"
                onClick={() => navigate(appRoute.initProject)}
                className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-transparent bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-glow hover:bg-accentHover"
              >
                <UiIcon name="plus" className="h-4 w-4" />
                Add new project
              </button>
              <button
                type="button"
                disabled={syncingProjectPath !== null}
                onClick={() => void handleSyncProject()}
                className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-border bg-bg px-4 py-2.5 text-sm font-semibold text-text hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                <UiIcon
                  name="refresh-circle"
                  className={
                    syncingProjectPath === "__new__"
                      ? "h-4 w-4 animate-spin"
                      : "h-4 w-4"
                  }
                />
                Sync project
              </button>
            </div>
          </div>

          {errorMessage ? (
            <Toast title="Already synced" message={errorMessage} onClose={() => setErrorMessage(null)} />
          ) : null}

          {hasSyncedProjects ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {syncedProjects.map((project) => {
                const isSyncing = syncingProjectPath === project.projectPath;

                return (
                  <SyncedProjectItem
                    key={project.id}
                    active={false}
                    project={project}
                    syncing={isSyncing}
                    onOpen={(path) => navigate(getWorkspaceProjectRoute(path))}
                    onRemove={onRemoveProject}
                    onResync={(path) => void handleSyncProject(path)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-border bg-bg/70 px-6 py-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-border bg-soft text-accent">
                <UiIcon name="folder" className="h-8 w-8" />
              </div>
              <p className="mt-5 text-lg font-semibold text-text">
                Your workspace is empty
              </p>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted">
                No project has been synced into this desktop app yet. Add a
                fresh project from the init flow or sync an existing folder so
                it appears here.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(appRoute.initProject)}
                  className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-transparent bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-glow hover:bg-accentHover"
                >
                  <UiIcon name="plus" className="h-4 w-4" />
                  Add new project
                </button>
                <button
                  type="button"
                  disabled={syncingProjectPath !== null}
                  onClick={() => void handleSyncProject()}
                  className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-border bg-soft px-4 py-2.5 text-sm font-semibold text-text hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <UiIcon
                    name="refresh-circle"
                    className={
                      syncingProjectPath === "__new__"
                        ? "h-4 w-4 animate-spin"
                        : "h-4 w-4"
                    }
                  />
                  Sync existing project
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
