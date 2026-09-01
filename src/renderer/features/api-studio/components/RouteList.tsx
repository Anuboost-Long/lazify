import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

import type { OpenExample } from "../custom-collection";
import type { SavedExample, SavedRoute } from "../types";
import { ExampleRow } from "./ExampleRow";
import { RouteRow } from "./RouteRow";

interface RouteListProps {
	routes: SavedRoute[];
	selectedRouteId: string | null;
	openExample: OpenExample | null;
	examplesOf: (routeId: string) => SavedExample[];
	onOpenExample: (routeId: string, exampleId: string) => void;
	onRemoveExample: (routeId: string, exampleId: string) => void;
	newSince: string | null;
	collapsedFolders: ReadonlySet<string>;
	searching: boolean;
	onSelectRoute: (routeId: string) => void;
	onToggleFolder: (folder: string) => void;
}

export function folderNameOf(routePath: string) {
	const firstSegment = routePath.split("/").find(Boolean);
	return firstSegment ?? "";
}

export function matchesQuery(route: SavedRoute, query: string) {
	return [route.method, route.path, route.summary, route.operationId, ...route.tags]
		.join(" ")
		.toLowerCase()
		.includes(query);
}

export function groupByResource(routes: SavedRoute[]) {
	const groups = new Map<string, SavedRoute[]>();

	for (const route of routes) {
		const resource = folderNameOf(route.path);
		const group = groups.get(resource);

		if (group) group.push(route);
		else groups.set(resource, [route]);
	}

	return Array.from(groups.entries());
}

export function RouteList({
	routes,
	selectedRouteId,
	openExample,
	examplesOf,
	onOpenExample,
	onRemoveExample,
	newSince,
	collapsedFolders,
	searching,
	onSelectRoute,
	onToggleFolder,
}: Readonly<RouteListProps>) {
	const { t } = useTranslation();

	return (
		<ul className="flex flex-col gap-2">
			{groupByResource(routes).map(([resource, resourceRoutes]) => (
				<li key={resource} className="flex flex-col gap-0.5">
					<button
						type="button"
						aria-expanded={searching || !collapsedFolders.has(resource)}
						onClick={() => onToggleFolder(resource)}
						className={clsx(
							"group flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left",
							"text-xs font-medium text-text transition-colors hover:bg-text/[0.05]",
						)}
					>
						<UiIcon
							name="arrow-right"
							className={clsx(
								"h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200",
								(searching || !collapsedFolders.has(resource)) && "rotate-90",
							)}
						/>
						<UiIcon name="folder" filled className="h-4 w-4 shrink-0 text-accent/80" />
						<span className="min-w-0 flex-1 truncate">{resource || t(translation.ApiStudio.Root)}</span>
						<span className="text-[10px] tabular-nums text-muted">{resourceRoutes.length}</span>
					</button>

					{searching || !collapsedFolders.has(resource) ? (
						<ul className="flex flex-col gap-0.5 pl-6">
							{resourceRoutes.map((route) => (
								<li key={route.id}>
									<RouteRow
										route={route}
										selected={route.id === selectedRouteId}
										foundByLastScan={Boolean(newSince) && route.firstSeenAt === newSince}
										onSelect={onSelectRoute}
									/>

									{examplesOf(route.id).length > 0 ? (
										<ul className="ml-6 mt-1 flex flex-col gap-0.5 border-l border-border pl-2.5">
											{examplesOf(route.id).map((example) => (
												<ExampleRow
													key={example.id}
													example={example}
													open={openExample?.ownerId === route.id && openExample.id === example.id}
													onOpen={() => onOpenExample(route.id, example.id)}
													onRemove={() => onRemoveExample(route.id, example.id)}
												/>
											))}
										</ul>
									) : null}
								</li>
							))}
						</ul>
					) : null}
				</li>
			))}
		</ul>
	);
}
