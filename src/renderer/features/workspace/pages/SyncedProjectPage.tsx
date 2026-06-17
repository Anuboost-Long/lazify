import { appRoute } from "@renderer/app/app-routes";
import { DependencyPane } from "@renderer/features/workspace/components/DependencyPane";
import { HealthPane } from "@renderer/features/workspace/components/HealthPane";
import { NodeVersionPane } from "@renderer/features/workspace/components/NodeVersionPane";
import { PackageVersionPane } from "@renderer/features/workspace/components/PackageVersionPane";
import { ScriptsPane } from "@renderer/features/workspace/components/ScriptsPane";
import { SyncedProjectViewer } from "@renderer/features/workspace/components/SyncedProjectViewer";
import { translation } from "@renderer/i18n/translation";
import type {
  ImportedProjectIndexResult,
  SyncedWorkspaceProject,
} from "@renderer/shared/types/lazify";
import { BodyText } from "@renderer/shared/typography";
import { PageHeader } from "@renderer/shared/ui/PageHeader";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

interface SyncedProjectPageProps {
  busy: boolean;
  syncedProjects: SyncedWorkspaceProject[];
  onNodeVersionChange: (projectPath: string, version: string | null) => void;
}

export function SyncedProjectPage({
  busy,
  syncedProjects,
  onNodeVersionChange,
}: Readonly<SyncedProjectPageProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projectPath: encodedProjectPath } = useParams<{
    projectPath: string;
  }>();

  const [loading, setLoading] = useState(false);
  const [projectData, setProjectData] =
    useState<ImportedProjectIndexResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [installing, setInstalling] = useState(false);
  const [installFeedback, setInstallFeedback] = useState<
    { tone: "success" | "error"; message: string } | null
  >(null);

  const decodedPath = encodedProjectPath
    ? decodeURIComponent(encodedProjectPath)
    : "";
  const syncedProject =
    syncedProjects.find((p) => p.projectPath === decodedPath) ?? null;

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
          ? { tone: "success", message: t(translation.SyncedProject.InstallSuccess) }
          : { tone: "error", message: t(translation.SyncedProject.InstallError) },
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

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page header ── */}
      <PageHeader
        eyebrow={t(translation.SyncedProject.Eyebrow)}
        title={syncedProject?.projectName ?? t(translation.SyncedProject.Title)}
        description={t(translation.SyncedProject.Description)}
        icon="folder"
      />

      {/* ── Back navigation ── */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(appRoute.workspace)}
          className="group inline-flex items-center gap-2 rounded-full border border-border bg-soft px-4 py-2 text-sm font-semibold text-muted hover:border-accent hover:text-text"
        >
          <UiIcon
            name="arrow-left"
            className="h-4 w-4 text-muted group-hover:text-accent"
          />
          {t(translation.SyncedProject.BackToWorkspace)}
        </button>

        {syncedProject && (
          <button
            type="button"
            onClick={() => void handleInstallDependencies()}
            disabled={busy || installing}
            className="group inline-flex items-center gap-2.5 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-[0_6px_20px_rgba(0,0,0,0.18)] ring-1 ring-accent/40 transition-all hover:-translate-y-px hover:shadow-[0_8px_26px_rgba(0,0,0,0.24)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            <UiIcon
              name={installing ? "refresh-circle" : "package"}
              className={`h-4 w-4 ${installing ? "animate-spin" : ""}`}
            />
            {installing
              ? t(translation.SyncedProject.Installing)
              : t(translation.SyncedProject.InstallDependencies)}
          </button>
        )}
      </div>

      {/* ── Feedback: dependency installation result ── */}
      {installFeedback && (
        <section
          className={
            installFeedback.tone === "success"
              ? "rounded-[24px] border border-border bg-soft p-4 shadow-panel"
              : "rounded-[24px] border border-red-300/40 bg-red-50 p-4 shadow-panel"
          }
        >
          <BodyText
            className={
              installFeedback.tone === "success"
                ? "leading-6 text-text"
                : "leading-6 text-red-700"
            }
          >
            {installFeedback.message}
          </BodyText>
        </section>
      )}

      {/* ── Feedback: project no longer in workspace ── */}
      {!syncedProject && (
        <section className="rounded-[24px] border border-border bg-soft p-6 shadow-panel">
          <BodyText tone="muted" className="leading-6">
            {t(translation.SyncedProject.NotSyncedAnymore)}
          </BodyText>
        </section>
      )}

      {/* ── Feedback: failed to load project index ── */}
      {errorMessage && (
        <section className="rounded-[24px] border border-red-300/40 bg-red-50 p-6 shadow-panel">
          <BodyText className="leading-6 text-red-700">{errorMessage}</BodyText>
        </section>
      )}

      {/* ── Feedback: project index loading ── */}
      {loading && !projectData && (
        <section className="rounded-[30px] border border-border bg-soft p-6 shadow-panel">
          <div className="flex items-center gap-3 text-sm text-muted">
            <UiIcon
              name="refresh-circle"
              className="h-5 w-5 animate-spin text-accent"
            />
            {t(translation.SyncedProject.Loading)}
          </div>
        </section>
      )}

      {/* ── File tree + git info ── */}
      {syncedProject && projectData && (
        <SyncedProjectViewer
          allowGitStatus
          busy={busy || loading}
          editable
          project={projectData}
        />
      )}

      {syncedProject && (
        <>
          {/* ── Health dashboard ── */}
          <HealthPane projectPath={syncedProject.projectPath} />

          {/* ── Runtime — set node version before running scripts ── */}
          <NodeVersionPane
            projectPath={syncedProject.projectPath}
            pinnedVersion={syncedProject.nodeVersion}
            onVersionChange={(version) =>
              onNodeVersionChange(syncedProject.projectPath, version)
            }
          />
          <ScriptsPane projectPath={syncedProject.projectPath} />

          {/* ── Package management ── */}
          <DependencyPane projectPath={syncedProject.projectPath} />
          <PackageVersionPane projectPath={syncedProject.projectPath} />
        </>
      )}
    </div>
  );
}
