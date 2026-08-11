import { PageActions, PageCrumb } from "@renderer/app/components/PageChrome";
import { DependencyPane } from "@renderer/features/workspace/components/DependencyPane";
import { HealthPane } from "@renderer/features/workspace/components/HealthPane";
import { NodeVersionPane } from "@renderer/features/workspace/components/NodeVersionPane";
import { PackageVersionPane } from "@renderer/features/workspace/components/PackageVersionPane";
import { ProjectAgentLauncher } from "@renderer/features/workspace/components/ProjectAgentLauncher";
import { ScriptsPane } from "@renderer/features/workspace/components/ScriptsPane";
import { SyncedProjectViewer } from "@renderer/features/workspace/components/SyncedProjectViewer";
import { translation } from "@renderer/i18n/translation";
import type {
  ImportedProjectIndexResult,
  SyncedWorkspaceProject,
} from "@renderer/shared/types/lazify";
import { BodyText, MonoText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { SidebarView } from "@renderer/shared/ui/project-tree/sidebar/types";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

interface SyncedProjectPageProps {
  busy: boolean;
  syncedProjects: SyncedWorkspaceProject[];
  onNodeVersionChange: (projectPath: string, version: string | null) => void;
  /** Records the opened project as the shared active one, so the Agents page
   *  lands on the same project the user last had open here. */
  onActiveProject: (projectPath: string) => void;
}

export function SyncedProjectPage({
  busy,
  syncedProjects,
  onNodeVersionChange,
  onActiveProject,
}: Readonly<SyncedProjectPageProps>) {
  const { t } = useTranslation();
  const { projectPath: encodedProjectPath } = useParams<{
    projectPath: string;
  }>();

  const [loading, setLoading] = useState(false);
  const [projectData, setProjectData] =
    useState<ImportedProjectIndexResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [agentPickerOpen, setAgentPickerOpen] = useState(false);

  const [installing, setInstalling] = useState(false);
  const [installFeedback, setInstallFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const decodedPath = encodedProjectPath
    ? decodeURIComponent(encodedProjectPath)
    : "";
  const syncedProject =
    syncedProjects.find((p) => p.projectPath === decodedPath) ?? null;

  // Opening a project here makes it the shared active project.
  useEffect(() => {
    if (syncedProject) onActiveProject(syncedProject.projectPath);
  }, [syncedProject, onActiveProject]);

  useEffect(() => {
    if (!decodedPath || !syncedProject) {
      setProjectData(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);
        const result =
          await globalThis.lazify.importProjectIndexFromDirectory(decodedPath);
        if (!cancelled) setProjectData(result);
      } catch (error) {
        if (!cancelled) {
          setProjectData(null);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : t(translation.SyncedProject.LoadError),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [decodedPath, syncedProject]);

  const handleInstallDependencies = async () => {
    if (!syncedProject) return;
    setInstalling(true);
    setInstallFeedback(null);
    try {
      const result = await globalThis.lazify.installProjectDependencies(
        syncedProject.projectPath,
      );
      setInstallFeedback(
        result.success
          ? {
              tone: "success",
              message: t(translation.SyncedProject.InstallSuccess),
            }
          : {
              tone: "error",
              message: t(translation.SyncedProject.InstallError),
            },
      );
    } catch {
      setInstallFeedback({
        tone: "error",
        message: t(translation.SyncedProject.InstallError),
      });
    } finally {
      setInstalling(false);
    }
  };

  /* The project tools, reachable from the workbench's right-hand rail. Every
     one stays mounted while the panel is closed — a running script lives in
     the Scripts pane's own state, and unmounting it would strand the process. */
  const toolViews: SidebarView[] = syncedProject
    ? [
        {
          id: "health",
          label: t(translation.HealthPane.Title),
          icon: "activity",
          content: <HealthPane projectPath={syncedProject.projectPath} />,
        },
        {
          id: "runtime",
          label: t(translation.NodeVersionPane.Title),
          icon: "terminal",
          content: (
            <NodeVersionPane
              projectPath={syncedProject.projectPath}
              pinnedVersion={syncedProject.nodeVersion}
              onVersionChange={(version) =>
                onNodeVersionChange(syncedProject.projectPath, version)
              }
            />
          ),
        },
        {
          id: "scripts",
          label: t(translation.ScriptsPane.Title),
          icon: "play",
          content: <ScriptsPane projectPath={syncedProject.projectPath} />,
        },
        {
          id: "dependencies",
          label: t(translation.DependencyPane.Title),
          icon: "package",
          content: <DependencyPane projectPath={syncedProject.projectPath} />,
        },
        {
          id: "packages",
          label: t(translation.PackageDoctor.Title),
          icon: "check-circle",
          content: (
            <PackageVersionPane projectPath={syncedProject.projectPath} />
          ),
        },
      ]
    : [];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* The page's identity and actions live in the shell's top bar, so the
          page body starts straight at the content. "Workspace" in the
          breadcrumb is the way back. */}
      <PageCrumb>
        <span className="shrink-0 text-xs text-muted/50">/</span>
        <MonoText as="span" className="truncate text-xs text-text">
          {syncedProject?.projectName ?? t(translation.SyncedProject.Title)}
        </MonoText>
      </PageCrumb>

      {syncedProject && (
        <PageActions>
          <button
            type="button"
            onClick={() => void handleInstallDependencies()}
            disabled={busy || installing}
            className="inline-flex items-center gap-1.5 rounded-[8px] bg-accent px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-accentHover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UiIcon
              name={installing ? "refresh-circle" : "package"}
              className={`h-3.5 w-3.5 ${installing ? "animate-spin" : ""}`}
            />
            {installing
              ? t(translation.SyncedProject.Installing)
              : t(translation.SyncedProject.InstallDependencies)}
          </button>
        </PageActions>
      )}

      {/* ── Feedback: dependency installation result ── */}
      {installFeedback && (
        <section
          className={
            installFeedback.tone === "success"
              ? "shrink-0 rounded-[12px] border border-border bg-soft px-4 py-3"
              : "shrink-0 rounded-[12px] border border-error/30 bg-error/10 px-4 py-3"
          }
        >
          <BodyText
            className={
              installFeedback.tone === "success"
                ? "text-sm leading-6 text-text"
                : "text-sm leading-6 text-error"
            }
          >
            {installFeedback.message}
          </BodyText>
        </section>
      )}

      {/* ── Feedback: project no longer in workspace ── */}
      {!syncedProject && (
        <section className="shrink-0 rounded-[12px] border border-border bg-soft px-4 py-3">
          <BodyText tone="muted" className="text-sm leading-6">
            {t(translation.SyncedProject.NotSyncedAnymore)}
          </BodyText>
        </section>
      )}

      {/* ── Feedback: failed to load project index ── */}
      {errorMessage && (
        <section className="shrink-0 rounded-[12px] border border-error/30 bg-error/10 px-4 py-3">
          <BodyText className="text-sm leading-6 text-error">
            {errorMessage}
          </BodyText>
        </section>
      )}

      {/* ── Feedback: project index loading ── */}
      {loading && !projectData && (
        <section className="shrink-0 rounded-[12px] border border-border bg-soft px-4 py-3">
          <div className="flex items-center gap-3 text-sm text-muted">
            <UiIcon
              name="refresh-circle"
              className="h-4 w-4 animate-spin text-accent"
            />
            {t(translation.SyncedProject.Loading)}
          </div>
        </section>
      )}

      {/* ── Workbench: explorer, editor, and the project tool rail ── */}
      {syncedProject && projectData && (
        <div className="min-h-0 flex-1">
          <SyncedProjectViewer
            allowGitStatus
            busy={busy || loading}
            editable
            project={projectData}
            toolViews={toolViews}
            onOpenConsole={() =>
              void globalThis.lazify.openTerminal(syncedProject.projectPath)
            }
            onStartAgent={() => setAgentPickerOpen(true)}
          />
        </div>
      )}

      {syncedProject && (
        <ProjectAgentLauncher
          open={agentPickerOpen}
          projectPath={syncedProject.projectPath}
          onClose={() => setAgentPickerOpen(false)}
        />
      )}
    </div>
  );
}
