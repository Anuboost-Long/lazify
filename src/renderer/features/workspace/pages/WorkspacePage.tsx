import { appRoute, getWorkspaceProjectRoute } from "@renderer/app/app-routes";
import { SessionsPane } from "@renderer/features/workspace/components/SessionsPane";
import { SyncedProjectItem } from "@renderer/features/workspace/components/synced-project-item/SyncedProjectItem";
import { translation } from "@renderer/i18n/translation";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import {
  BodyText,
  CardTitle,
  OverlineText,
  SectionTitle,
} from "@renderer/shared/typography";
import { SearchInput } from "@renderer/shared/ui/form/SearchInput";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { Toast } from "@renderer/shared/ui/toast/Toast";
import clsx from "clsx";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

type ProjectSortKey = "recent" | "name";

interface WorkspacePageProps {
  syncedProjects: SyncedWorkspaceProject[];
  onSyncProject: (
    projectPath?: string | null,
  ) => Promise<SyncedWorkspaceProject | null>;
  onRemoveProject: (projectPath: string) => void;
}

export function WorkspacePage({
  syncedProjects,
  onSyncProject,
  onRemoveProject,
}: Readonly<WorkspacePageProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [syncingProjectPath, setSyncingProjectPath] = useState<string | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<ProjectSortKey>("recent");
  const hasSyncedProjects = syncedProjects.length > 0;

  const sortOptions: Array<{ id: ProjectSortKey; label: string }> = [
    { id: "recent", label: t(translation.Workspace.SortByRecent) },
    { id: "name", label: t(translation.Workspace.SortByName) },
  ];

  const visibleProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matched = query
      ? syncedProjects.filter(
          (project) =>
            project.projectName.toLowerCase().includes(query) ||
            project.projectPath.toLowerCase().includes(query),
        )
      : syncedProjects;

    return [...matched].sort((a, b) =>
      sortKey === "name"
        ? a.projectName.localeCompare(b.projectName)
        : new Date(b.lastSyncedAt).getTime() -
          new Date(a.lastSyncedAt).getTime(),
    );
  }, [syncedProjects, searchQuery, sortKey]);

  const handleSyncProject = async (projectPath?: string | null) => {
    try {
      setErrorMessage(null);
      setSyncingProjectPath(projectPath ?? "__new__");
      await onSyncProject(projectPath);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t(translation.Workspace.SyncError),
      );
    } finally {
      setSyncingProjectPath(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
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
            <Toast
              title={t(translation.Workspace.AlreadySynced)}
              message={errorMessage}
              onClose={() => setErrorMessage(null)}
            />
          ) : null}

          {hasSyncedProjects ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <SearchInput
                  size="md"
                  className="sm:max-w-xs"
                  label={t(translation.Workspace.SearchPlaceholder)}
                  clearLabel={t(translation.GlobalTerm.ClearSearch)}
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="text-xs font-semibold text-muted">
                    {t(translation.Workspace.SortLabel)}
                  </span>
                  <div className="flex items-center gap-1.5 rounded-[14px] border border-border bg-bg p-1">
                    {sortOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSortKey(option.id)}
                        className={clsx(
                          "rounded-[10px] px-3 py-1 text-xs font-semibold transition-all duration-100",
                          sortKey === option.id
                            ? "bg-accentSoft text-accent"
                            : "text-muted hover:text-text",
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {visibleProjects.length > 0 ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {visibleProjects.map((project) => {
                    const isSyncing =
                      syncingProjectPath === project.projectPath;

                    return (
                      <SyncedProjectItem
                        key={project.id}
                        active={false}
                        project={project}
                        syncing={isSyncing}
                        onOpen={(path) =>
                          navigate(getWorkspaceProjectRoute(path))
                        }
                        onRemove={onRemoveProject}
                        onResync={(path) => void handleSyncProject(path)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[28px] border border-dashed border-border bg-bg/70 px-6 py-10 text-center">
                  <BodyText tone="muted">
                    {t(translation.Workspace.NoSearchResults)}
                  </BodyText>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="mt-3 text-sm font-semibold text-accent hover:underline"
                  >
                    {t(translation.GlobalTerm.ClearSearch)}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-[28px] border border-dashed border-border bg-bg/70 px-6 py-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-border bg-soft text-accent">
                <UiIcon name="folder" className="h-8 w-8" />
              </div>
              <CardTitle className="mt-5">
                {t(translation.Workspace.EmptyTitle)}
              </CardTitle>
              <BodyText
                tone="muted"
                className="mx-auto mt-3 max-w-xl leading-6"
              >
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
