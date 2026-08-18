import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { RouteScanWarning, SavedRoute, UnsupportedConstruct } from "../types";
import { CollectionEmptyState } from "./CollectionEmptyState";
import { folderNameOf, RouteList } from "./RouteList";
import { ScanReviewList } from "./ScanReviewList";

interface RouteCollectionPaneProps {
  routes: SavedRoute[];
  newSince: string | null;
  warnings: RouteScanWarning[];
  unsupported: UnsupportedConstruct[];
  scanning: boolean;
  scanError: string | null;
  hasProject: boolean;
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
  onSyncProject: () => Promise<SyncedWorkspaceProject | null>;
}

function matchesQuery(route: SavedRoute, query: string) {
  return [route.method, route.path, route.summary, route.operationId, ...route.tags]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

export function RouteCollectionPane({
  routes,
  newSince,
  warnings,
  unsupported,
  scanning,
  scanError,
  hasProject,
  selectedRouteId,
  onSelectRoute,
  onSyncProject
}: Readonly<RouteCollectionPaneProps>) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const normalizedQuery = query.trim().toLowerCase();
  const visibleRoutes = normalizedQuery
    ? routes.filter((route) => matchesQuery(route, normalizedQuery))
    : routes;
  const folderNames = Array.from(new Set(routes.map((route) => folderNameOf(route.path))));
  const allCollapsed =
    folderNames.length > 0 && folderNames.every((folder) => collapsedFolders.has(folder));

  const toggleFolder = (folder: string) => {
    setCollapsedFolders((current) => {
      const next = new Set(current);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });
  };

  return (
    <aside className="flex h-full min-h-0 w-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text">
            {t(translation.ApiStudio.Routes)}
          </span>
          <span className="rounded-full bg-text/[0.06] px-2 py-0.5 text-[10px] text-muted">
            {routes.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={routes.length === 0 || allCollapsed}
            title={t(translation.ProjectTree.CollapseAll)}
            aria-label={t(translation.ProjectTree.CollapseAll)}
            onClick={() => setCollapsedFolders(new Set(folderNames))}
            className={clsx(
              "flex h-7 w-7 items-center justify-center rounded-md text-muted",
              "transition-colors hover:bg-text/[0.05] hover:text-text",
              "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            )}
          >
            <UiIcon name="collapse" className="h-4 w-4" />
          </button>

          <button
            type="button"
            disabled
            title={t(translation.ApiStudio.ManualRoutePending)}
            className="flex h-7 w-7 items-center justify-center text-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            <UiIcon name="plus" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <label className="relative mx-3 mt-3 block">
        <span className="sr-only">{t(translation.ApiStudio.SearchRoutes)}</span>
        <UiIcon
          name="search"
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          value={query}
          disabled={routes.length === 0}
          placeholder={t(translation.ApiStudio.SearchRoutes)}
          onChange={(event) => setQuery(event.target.value)}
          className={clsx(
            "h-9 w-full rounded-lg border border-border bg-bg/45 pl-9 pr-3",
            "text-xs text-text outline-none placeholder:text-muted/70",
            "focus:border-accent/50 disabled:cursor-not-allowed disabled:opacity-55"
          )}
        />
      </label>

      <div className="flex min-h-[180px] flex-1 flex-col overflow-y-auto p-3">
        {visibleRoutes.length > 0 ? (
          <RouteList
            routes={visibleRoutes}
            selectedRouteId={selectedRouteId}
            newSince={newSince}
            collapsedFolders={collapsedFolders}
            searching={Boolean(normalizedQuery)}
            onSelectRoute={onSelectRoute}
            onToggleFolder={toggleFolder}
          />
        ) : (
          <CollectionEmptyState
            hasProject={hasProject}
            scanning={scanning}
            scanError={scanError}
            searching={routes.length > 0}
            onSyncProject={onSyncProject}
          />
        )}
      </div>

      <ScanReviewList warnings={warnings} unsupported={unsupported} />
    </aside>
  );
}
