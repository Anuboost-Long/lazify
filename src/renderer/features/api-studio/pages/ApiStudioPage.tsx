import clsx from "clsx";
import { useEffect, useState } from "react";
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
import { customRequestStore } from "../hooks/custom-request-store";
import { useApiEnvironment } from "../hooks/use-api-environment";
import { useCustomCollection } from "../hooks/use-custom-collection";
import { useRequestTabs, tabKey, type RequestTab } from "../hooks/use-request-tabs";
import { useSavedRequests } from "../hooks/use-saved-requests";
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
  const [editingEnvironment, setEditingEnvironment] = useState(false);
  const routes = saved?.routes ?? [];
  const environment = useApiEnvironment(projectPath, routes);
  const custom = useCustomCollection(projectPath);
  const tabs = useRequestTabs(projectPath);
  const projectRequests = useSavedRequests(projectPath);
  const active = tabs.active;
  const activeRouteId = active?.kind === "route" ? active.id : null;
  const showingExample = Boolean(active?.exampleId);
  const selectedRouteId = showingExample ? null : activeRouteId;
  const openRequestId =
    active?.kind === "custom" && !showingExample ? active.id : null;
  const openRequest =
    active?.kind === "custom" ? custom.requestById(active.id) : null;
  const openRoute = useRouteDetails(
    projectPath,
    routes.find((route) => route.id === activeRouteId) ?? null,
    saved?.scannedAt ?? null
  );
  const open = openRequest ? { ...openRequest.route, id: openRequest.id } : openRoute;
  const examplesOf = (tab: RequestTab) =>
    tab.kind === "custom"
      ? (custom.requestById(tab.id)?.examples ?? [])
      : (projectRequests.saved(tab.id)?.examples ?? []);
  const openExample =
    active?.exampleId
      ? (examplesOf(active).find((example) => example.id === active.exampleId) ?? null)
      : null;
  const openExampleOf = active?.exampleId ? { ownerId: active.id, id: active.exampleId } : null;
  const tabViews = tabs.open.map((tab) => {
    const request = tab.kind === "custom" ? custom.requestById(tab.id) : null;
    const route = tab.kind === "route" ? routes.find((entry) => entry.id === tab.id) : null;
    const example = tab.exampleId
      ? examplesOf(tab).find((entry) => entry.id === tab.exampleId)
      : null;

    return {
      key: tabKey(tab),
      method: request?.route.method ?? route?.method ?? "GET",
      label: example?.name ?? request?.name ?? route?.path ?? tab.id
    };
  });

  useEffect(() => {
    tabs.keep((tab) => {
      if (tab.kind === "custom" && !custom.requestById(tab.id)) return false;

      return !tab.exampleId || examplesOf(tab).some((example) => example.id === tab.exampleId);
    });
  }, [custom.collections, projectRequests.saved]);

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
              projectPath={projectPath}
              selectedRouteId={selectedRouteId}
              custom={custom}
              openRequestId={openRequestId}
              openExample={openExampleOf}
              onSelectRoute={(routeId) => tabs.show({ kind: "route", id: routeId })}
              onOpenRequest={(requestId) => tabs.show({ kind: "custom", id: requestId })}
              onOpenExample={(requestId, exampleId) =>
                tabs.show({ kind: "custom", id: requestId, exampleId })
              }
              routeExamples={(routeId) => projectRequests.saved(routeId)?.examples ?? []}
              onOpenRouteExample={(routeId, exampleId) =>
                tabs.show({ kind: "route", id: routeId, exampleId })
              }
              onRemoveRouteExample={projectRequests.forgetExample}
              onSyncProject={onSyncProject}
            />
          }
          second={
            <RequestWorkspace
              projectPath={projectPath}
              route={open}
              store={
                active?.kind === "custom" ? customRequestStore(custom, projectPath) : projectRequests
              }
              inCollection={active?.kind === "custom"}
              readExampleBody={
                active?.kind === "custom"
                  ? (bodyFile) => globalThis.lazify.readApiCollectionBody(projectPath, bodyFile)
                  : projectRequests.readBody
              }
              example={openExample}
              tabs={tabViews}
              activeTabKey={tabs.activeKey}
              onActivateTab={tabs.activate}
              onCloseTab={tabs.close}
              onCloseAllTabs={tabs.closeAll}
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
        onDuplicateVariable={environment.duplicateVariable}
        onKeepSecret={environment.keepSecret}
        onRenameVariable={environment.renameVariable}
        onRemoveVariable={environment.removeVariable}
        onClose={() => setEditingEnvironment(false)}
      />
    </div>
  );
}
