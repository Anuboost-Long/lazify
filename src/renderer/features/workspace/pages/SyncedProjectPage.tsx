import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { appRoute } from "@renderer/app/app-routes";
import { translation } from "@renderer/i18n/translation";
import { SyncedProjectViewer } from "@renderer/features/workspace/components/SyncedProjectViewer";
import { PackageVersionPane } from "@renderer/features/workspace/components/PackageVersionPane";
import { BodyText } from "@renderer/shared/typography";
import { PageHeader } from "@renderer/shared/ui/PageHeader";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type {
  ImportedProjectIndexResult,
  SyncedWorkspaceProject
} from "@renderer/shared/types/lazify";
import { useTranslation } from "react-i18next";

interface SyncedProjectPageProps {
  busy: boolean;
  syncedProjects: SyncedWorkspaceProject[];
}

export function SyncedProjectPage({
  busy,
  syncedProjects
}: SyncedProjectPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projectPath: encodedProjectPath } = useParams<{ projectPath: string }>();
  const [loading, setLoading] = useState(false);
  const [projectData, setProjectData] = useState<ImportedProjectIndexResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const decodedProjectPath = encodedProjectPath ? decodeURIComponent(encodedProjectPath) : "";
  const syncedProject = syncedProjects.find((project) => project.projectPath === decodedProjectPath) ?? null;

  useEffect(() => {
    if (!decodedProjectPath || !syncedProject) {
      setProjectData(null);
      return;
    }

    let cancelled = false;

    const loadProject = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);
        const result = await window.lazify.importProjectIndexFromDirectory(decodedProjectPath);

        if (!cancelled) {
          setProjectData(result);
        }
      } catch (error) {
        if (!cancelled) {
          setProjectData(null);
          setErrorMessage(error instanceof Error ? error.message : t(translation.SyncedProject.LoadError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProject();

    return () => {
      cancelled = true;
    };
  }, [decodedProjectPath, syncedProject]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t(translation.SyncedProject.Eyebrow)}
        title={syncedProject?.projectName ?? t(translation.SyncedProject.Title)}
        description={t(translation.SyncedProject.Description)}
        icon="folder"
      />

      <div>
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
      </div>

      {!syncedProject ? (
        <section className="rounded-[24px] border border-border bg-soft p-6 shadow-panel">
          <BodyText tone="muted" className="leading-6">
            {t(translation.SyncedProject.NotSyncedAnymore)}
          </BodyText>
        </section>
      ) : null}

      {errorMessage ? (
        <section className="rounded-[24px] border border-red-300/40 bg-red-50 p-6 shadow-panel">
          <BodyText className="leading-6 text-red-700">
            {errorMessage}
          </BodyText>
        </section>
      ) : null}

      {loading && !projectData ? (
        <section className="rounded-[30px] border border-border bg-soft p-6 shadow-panel">
          <div className="flex items-center gap-3 text-sm text-muted">
            <UiIcon name="refresh-circle" className="h-5 w-5 animate-spin text-accent" />
            {t(translation.SyncedProject.Loading)}
          </div>
        </section>
      ) : null}

      {syncedProject && projectData ? (
        <SyncedProjectViewer
          allowGitStatus
          busy={busy || loading}
          editable
          project={projectData}
        />
      ) : null}

      {syncedProject && decodedProjectPath ? (
        <PackageVersionPane projectPath={decodedProjectPath} />
      ) : null}
    </div>
  );
}
