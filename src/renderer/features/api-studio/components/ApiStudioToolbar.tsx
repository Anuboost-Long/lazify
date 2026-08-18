import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { ProjectPickerModal } from "@renderer/shared/ui/project-picker/ProjectPickerModal";
import type { ApiEnvironment } from "../types";
import { EnvironmentPicker } from "./EnvironmentPicker";

interface ApiStudioToolbarProps {
  projects: SyncedWorkspaceProject[];
  projectPath: string;
  scanning: boolean;
  scannedAt: string | null;
  missingVariableCount: number;
  environments: ApiEnvironment[];
  activeEnvironmentId: string;
  onProjectChange: (projectPath: string) => void;
  onScan: () => void;
  onSelectEnvironment: (id: string) => void;
  onOpenEnvironment: () => void;
}

function formatScannedAt(scannedAt: string) {
  const at = new Date(scannedAt);

  return `${at.toLocaleDateString()} ${at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export function ApiStudioToolbar({
  projects,
  projectPath,
  scanning,
  scannedAt,
  missingVariableCount,
  environments,
  activeEnvironmentId,
  onProjectChange,
  onScan,
  onSelectEnvironment,
  onOpenEnvironment
}: Readonly<ApiStudioToolbarProps>) {
  const { t } = useTranslation();
  const [pickingProject, setPickingProject] = useState(false);
  const projectName =
    projects.find((project) => project.projectPath === projectPath)?.projectName ??
    t(translation.ApiStudio.ChooseProject);

  return (
    <>
      <header
        className={clsx(
          "flex flex-wrap items-center justify-between gap-3 border-b border-border",
          "bg-bg/45 px-4 py-3"
        )}
      >
        <button
          type="button"
          onClick={() => setPickingProject(true)}
          className={clsx(
            "group flex h-10 min-w-0 max-w-[300px] items-center gap-2.5 rounded-lg px-2 pr-3",
            "bg-soft border border-border",
            "text-left transition-colors",
            "hover:border-accent/45"
          )}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
            <UiIcon name="folder" filled className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[9px] font-semibold uppercase tracking-[0.13em] text-muted">
              {t(translation.ApiStudio.Project)}
            </span>
            <span className="block truncate text-xs font-semibold text-text">{projectName}</span>
          </span>
          <UiIcon
            name="arrow-right"
            className="h-3.5 w-3.5 shrink-0 rotate-90 text-muted transition-colors group-hover:text-accent"
          />
        </button>

        <div className="flex items-center gap-2">
          {scannedAt ? (
            <span
              title=".lazify/api-studio-routes.json"
              className="hidden text-[10px] leading-4 text-muted sm:block"
            >
              {t(translation.ApiStudio.Scanned)} {formatScannedAt(scannedAt)}
            </span>
          ) : null}

          <EnvironmentPicker
            environments={environments}
            activeId={activeEnvironmentId}
            missingCount={missingVariableCount}
            onSelect={onSelectEnvironment}
            onManage={onOpenEnvironment}
          />

          <button
            type="button"
            disabled
            title={t(translation.ApiStudio.ImportPending)}
            className={clsx(
              "flex h-10 items-center gap-1.5 rounded-lg border border-border px-3",
              "text-xs font-medium text-muted disabled:cursor-not-allowed disabled:opacity-45"
            )}
          >
            <UiIcon name="import" className="h-3.5 w-3.5" />
            {t(translation.ApiStudio.ImportOpenapi)}
          </button>

          <button
            type="button"
            disabled={!projectPath || scanning}
            onClick={onScan}
            className={clsx(
              "flex h-10 items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3",
              "text-xs font-semibold text-accent transition-colors",
              "hover:bg-accent/[0.16] disabled:cursor-not-allowed disabled:opacity-45"
            )}
          >
            <UiIcon
              name={scanning ? "refresh-circle" : "search"}
              className={clsx("h-3.5 w-3.5", scanning && "animate-spin")}
            />
            {t(scanning ? translation.ApiStudio.Scanning : translation.ApiStudio.ScanRoutes)}
          </button>
        </div>
      </header>

      <ProjectPickerModal
        open={pickingProject}
        projects={projects}
        selectedPath={projectPath}
        title={translation.ApiStudio.ChooseProject}
        emptyMessage={translation.ApiStudio.SyncProjectFirst}
        onSelect={onProjectChange}
        onClose={() => setPickingProject(false)}
      />
    </>
  );
}
