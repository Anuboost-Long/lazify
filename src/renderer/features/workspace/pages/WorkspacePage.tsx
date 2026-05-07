import { appRoute, getWorkspaceProjectRoute } from "@renderer/app/app-routes";
import { SessionsPane } from "@renderer/features/workspace/components/SessionsPane";
import { translation } from "@renderer/i18n/translation";
import { SyncedProjectItem } from "@renderer/features/workspace/components/synced-project-item/SyncedProjectItem";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import { BodyText, CardTitle, OverlineText, SectionTitle } from "@renderer/shared/typography";
import { PageHeader } from "@renderer/shared/ui/PageHeader";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { Toast } from "@renderer/shared/ui/toast/Toast";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
        error instanceof Error ? error.message : t(translation.Workspace.SyncError)
      );
    } finally {
      setSyncingProjectPath(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t(translation.Workspace.Eyebrow)}
        title={t(translation.Workspace.Title)}
        description={t(translation.Workspace.Description)}
        icon="folder"
      />

      <section className="relative overflow-hidden rounded-[30px] border border-border bg-soft p-6 shadow-panel">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(circle at top left, rgb(var(--color-accent) / 0.18), transparent 38%), linear-gradient(135deg, rgba(255, 255, 255, 0.02), transparent 55%)",
          }}
        />

        <div className="relative flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <OverlineText>
                {t(translation.Workspace.SyncedProjects)}
              </OverlineText>
              <SectionTitle className="mt-3">
                {hasSyncedProjects
                  ? t(translation.Workspace.ProjectsAvailable)
                  : t(translation.Workspace.NoSyncedYet)}
              </SectionTitle>
              <BodyText tone="muted" className="mt-3 leading-6">
                {hasSyncedProjects
                  ? t(translation.Workspace.ProjectsDesc)
                  : t(translation.Workspace.NoProjectsDesc)}
              </BodyText>
            </div>

            <div className="flex flex-wrap justify-end gap-3 self-end lg:max-w-sm">
              <button
                type="button"
                onClick={() => navigate(appRoute.initProject)}
                className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-transparent bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-glow hover:bg-accentHover"
              >
                <UiIcon name="plus" className="h-4 w-4" />
                {t(translation.Workspace.AddNewProject)}
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
                {t(translation.Workspace.SyncProject)}
              </button>
            </div>
          </div>

          {errorMessage ? (
            <Toast title={t(translation.Workspace.AlreadySynced)} message={errorMessage} onClose={() => setErrorMessage(null)} />
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
              <CardTitle className="mt-5">
                {t(translation.Workspace.EmptyTitle)}
              </CardTitle>
              <BodyText tone="muted" className="mx-auto mt-3 max-w-xl leading-6">
                {t(translation.Workspace.EmptyLongDesc)}
              </BodyText>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(appRoute.initProject)}
                  className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-transparent bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-glow hover:bg-accentHover"
                >
                  <UiIcon name="plus" className="h-4 w-4" />
                  {t(translation.Workspace.AddNewProject)}
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
                  {t(translation.Workspace.SyncExisting)}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <SessionsPane />

    </div>
  );
}
