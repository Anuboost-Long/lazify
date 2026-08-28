import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import { SearchInput } from "@renderer/shared/ui/form/SearchInput";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

import { requestCount, type CollectionMode, type OpenExample } from "../custom-collection";
import type { CustomCollectionApi } from "../hooks/use-custom-collection";
import type { RouteScanWarning, SavedExample, SavedRoute, UnsupportedConstruct } from "../types";
import { CollectionEmptyState } from "./CollectionEmptyState";
import { CollectionModeToggle } from "./CollectionModeToggle";
import { CustomCollectionPane } from "./CustomCollectionPane";
import { folderNameOf, matchesQuery, RouteList } from "./RouteList";
import { ScanReviewList } from "./ScanReviewList";

interface RouteCollectionPaneProps {
	routes: SavedRoute[];
	newSince: string | null;
	warnings: RouteScanWarning[];
	unsupported: UnsupportedConstruct[];
	scanning: boolean;
	scanError: string | null;
	hasProject: boolean;
	projectPath: string;
	selectedRouteId: string | null;
	custom: CustomCollectionApi;
	openRequestId: string | null;
	onSelectRoute: (routeId: string) => void;
	openExample: OpenExample | null;
	onOpenRequest: (requestId: string) => void;
	onOpenExample: (requestId: string, exampleId: string) => void;
	routeExamples: (routeId: string) => SavedExample[];
	onOpenRouteExample: (routeId: string, exampleId: string) => void;
	onRemoveRouteExample: (routeId: string, exampleId: string) => void;
	onSyncProject: () => Promise<SyncedWorkspaceProject | null>;
}

export function RouteCollectionPane({
	routes,
	newSince,
	warnings,
	unsupported,
	scanning,
	scanError,
	hasProject,
	projectPath,
	selectedRouteId,
	custom,
	openRequestId,
	onSelectRoute,
	openExample,
	onOpenRequest,
	onOpenExample,
	routeExamples,
	onOpenRouteExample,
	onRemoveRouteExample,
	onSyncProject,
}: Readonly<RouteCollectionPaneProps>) {
	const { t } = useTranslation();
	const [mode, setMode] = useState<CollectionMode>("discovered");
	const [query, setQuery] = useState("");
	const [exporting, setExporting] = useState(false);
	const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
	const normalizedQuery = query.trim().toLowerCase();
	const visibleRoutes = normalizedQuery
		? routes.filter((route) => matchesQuery(route, normalizedQuery))
		: routes;
	const folderNames = Array.from(new Set(routes.map((route) => folderNameOf(route.path))));
	const allCollapsed =
		folderNames.length > 0 && folderNames.every((folder) => collapsedFolders.has(folder));
	const nothingToCollapse =
		mode === "custom" ? custom.expanded.size === 0 : routes.length === 0 || allCollapsed;

	const toggleFolder = (folder: string) => {
		setCollapsedFolders((current) => {
			const next = new Set(current);
			if (next.has(folder)) next.delete(folder);
			else next.add(folder);
			return next;
		});
	};

	const listing = () => {
		if (mode === "custom") {
			return (
				<CustomCollectionPane
					custom={custom}
					projectPath={projectPath}
					routes={routes}
					openRequestId={openRequestId}
					openExample={openExample}
					onOpenRequest={onOpenRequest}
					onOpenExample={onOpenExample}
				/>
			);
		}

		if (visibleRoutes.length > 0) {
			return (
				<RouteList
					routes={visibleRoutes}
					selectedRouteId={selectedRouteId}
					openExample={openExample}
					examplesOf={routeExamples}
					onOpenExample={onOpenRouteExample}
					onRemoveExample={onRemoveRouteExample}
					newSince={newSince}
					collapsedFolders={collapsedFolders}
					searching={Boolean(normalizedQuery)}
					onSelectRoute={onSelectRoute}
					onToggleFolder={toggleFolder}
				/>
			);
		}

		return (
			<CollectionEmptyState
				hasProject={hasProject}
				scanning={scanning}
				scanError={scanError}
				searching={routes.length > 0}
				onSyncProject={onSyncProject}
			/>
		);
	};

	return (
		<aside className="flex h-full min-h-0 w-full flex-col">
			<div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
				<CollectionModeToggle
					mode={mode}
					discoveredCount={routes.length}
					customCount={requestCount(custom.collections)}
					onChange={setMode}
				/>

				<div className="flex items-center gap-1">
					<button
						type="button"
						disabled={nothingToCollapse}
						title={t(translation.ProjectTree.CollapseAll)}
						aria-label={t(translation.ProjectTree.CollapseAll)}
						onClick={() =>
							mode === "custom" ? custom.collapseAll() : setCollapsedFolders(new Set(folderNames))
						}
						className={clsx(
							"flex h-7 w-7 items-center justify-center rounded-md text-muted",
							"transition-colors hover:bg-text/[0.05] hover:text-text",
							"disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
						)}
					>
						<UiIcon name="collapse" className="h-4 w-4" />
					</button>
				</div>
			</div>

			{mode === "custom" ? null : (
				<div className="mx-3 mt-3 flex items-center gap-2">
					<SearchInput
						className="flex-1"
						label={t(translation.ApiStudio.SearchRoutes)}
						value={query}
						onValueChange={setQuery}
						disabled={routes.length === 0}
					/>

					<button
						type="button"
						disabled={routes.length === 0 || exporting}
						title={t(translation.ApiStudio.ExportCollectionDesc)}
						aria-label={t(translation.ApiStudio.ExportCollection)}
						onClick={() => {
							setExporting(true);
							void globalThis.lazify
								.exportPostmanCollection(projectPath)
								.catch(() => null)
								.finally(() => setExporting(false));
						}}
						className={clsx(
							"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border",
							"text-muted transition-colors hover:border-accent/40 hover:text-text",
							"disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border",
						)}
					>
						<UiIcon name={exporting ? "refresh-circle" : "download"} className="h-4 w-4" />
					</button>
				</div>
			)}

			<div className="flex min-h-[180px] flex-1 flex-col overflow-y-auto p-3">{listing()}</div>

			{mode === "custom" ? null : <ScanReviewList warnings={warnings} unsupported={unsupported} />}
		</aside>
	);
}
