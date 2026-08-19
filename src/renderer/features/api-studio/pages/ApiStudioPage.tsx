import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import { SplitPane } from "@renderer/shared/ui/split/SplitPane";
import { apiStudioTool } from "../../tools/catalog";
import { ToolPageHeader } from "../../tools/components/ToolPageHeader";
import { ApiStudioToolbar } from "../components/ApiStudioToolbar";
import { EnvironmentModal } from "../components/EnvironmentModal";
import { RequestWorkspace } from "../components/RequestWorkspace";
import { RouteCollectionPane } from "../components/RouteCollectionPane";
import { useApiEnvironment } from "../hooks/use-api-environment";
import { useRouteDetails } from "../hooks/use-route-details";
import { useRouteScan } from "../hooks/use-route-scan";

interface ApiStudioPageProps {
  projects: SyncedWorkspaceProject[];
  activeProjectPath: string | null;
  onActiveProjectChange: (projectPath: string) => void;
  onSyncProject: () => Promise<SyncedWorkspaceProject | null>;
}

export function ApiStudioPage({
  projects,
  activeProjectPath,
  onActiveProjectChange,
  onSyncProject
}: Readonly<ApiStudioPageProps>) {
  const { t } = useTranslation();
  const projectPath =
    projects.find((project) => project.projectPath === activeProjectPath)?.projectPath ??
    projects[0]?.projectPath ??
    "";
  const { saved, loading, scanning, error, scan } = useRouteScan(projectPath);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [editingEnvironment, setEditingEnvironment] = useState(false);
  const routes = saved?.routes ?? [];
  const environment = useApiEnvironment(projectPath, routes);
  const openRoute = useRouteDetails(
    projectPath,
    routes.find((route) => route.id === selectedRouteId) ?? null
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <ToolPageHeader tool={apiStudioTool} />

      <section
        className={clsx(
          "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border",
          "bg-soft"
        )}
      >
        <ApiStudioToolbar
          projects={projects}
          projectPath={projectPath}
          scanning={scanning}
          scannedAt={saved?.scannedAt ?? null}
          missingVariableCount={environment.missing.length}
          environments={environment.environments}
          activeEnvironmentId={environment.active.id}
          onProjectChange={onActiveProjectChange}
          onScan={() => void scan()}
          onSelectEnvironment={environment.selectEnvironment}
          onOpenEnvironment={() => setEditingEnvironment(true)}
        />

        <SplitPane
          className="min-h-0 flex-1"
          storageKey="lazify-api-studio-split"
          defaultSize={290}
          minSize={220}
          minOtherSize={420}
          label={t(translation.ApiStudio.ResizePanels)}
          first={
            <RouteCollectionPane
              routes={routes}
              newSince={saved && saved.createdAt !== saved.scannedAt ? saved.scannedAt : null}
              warnings={saved?.warnings ?? []}
              unsupported={saved?.unsupported ?? []}
              scanning={scanning || loading}
              scanError={error}
              hasProject={Boolean(projectPath)}
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
              onSyncProject={onSyncProject}
            />
          }
          second={
            <RequestWorkspace
              projectPath={projectPath}
              route={openRoute}
              variables={environment.variables}
              values={environment.values}
              onOpenEnvironment={() => setEditingEnvironment(true)}
              onValuesChange={environment.updateActive}
            />
          }
        />
      </section>

      <EnvironmentModal
        open={editingEnvironment}
        variables={environment.variables}
        environments={environment.environments}
        active={environment.active}
        onSelect={environment.selectEnvironment}
        onAdd={() => environment.addEnvironment(t(translation.ApiStudio.AddEnvironment))}
        onDuplicate={() =>
          environment.addEnvironment(
            `${environment.active.name} ${environment.environments.length + 1}`,
            environment.active
          )
        }
        onRemove={environment.removeEnvironment}
        onRename={environment.renameEnvironment}
        onChange={environment.updateActive}
        onAddVariable={environment.addVariable}
        onRemoveVariable={environment.removeVariable}
        onClose={() => setEditingEnvironment(false)}
      />
    </div>
  );
}
