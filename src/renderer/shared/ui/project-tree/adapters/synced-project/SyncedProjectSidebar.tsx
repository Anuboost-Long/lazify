import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { GitStatusEntry, ProjectGitStatusResult } from "@renderer/shared/types/lazify";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { ProjectTreeActions } from "@renderer/shared/ui/project-tree/core/ProjectTreeActions";
import { ProjectSearchPane } from "@renderer/shared/ui/project-tree/search";
import type { SidebarView } from "@renderer/shared/ui/project-tree/sidebar/types";
import { WorkbenchLeftPanel } from "@renderer/shared/ui/project-tree/sidebar/WorkbenchLeftPanel";
import { Tooltip } from "@renderer/shared/ui/Tooltip";

import type { SidebarPanelId, useSyncedProjectTree } from "./useSyncedProjectTree";

const IS_MAC = navigator.userAgent.includes("Mac OS X");

interface SyncedProjectSidebarProps {
	adapter: ReturnType<typeof useSyncedProjectTree>;
	busy: boolean;
	editable: boolean;
	explorer: ReactNode;
	projectPath: string;
	renderGitPane?: (props: {
		busy: boolean;
		gitStatus: ProjectGitStatusResult | null;
		loading: boolean;
		selectedPath: string | null;
		onSelect: (entry: GitStatusEntry) => void;
		projectPath: string;
		onBranchSwitched: () => void;
	}) => ReactNode;
}

export function SyncedProjectSidebar({
	adapter,
	busy,
	editable,
	explorer,
	projectPath,
	renderGitPane,
}: Readonly<SyncedProjectSidebarProps>) {
	const { t } = useTranslation();
	const rootRef = useRef<HTMLDivElement>(null);
	const [searchFocusNonce, setSearchFocusNonce] = useState(0);
	const { setActivePanel } = adapter;

	const activateSearch = useCallback(() => {
		setActivePanel("search");
		setSearchFocusNonce((current) => current + 1);
	}, [setActivePanel]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const modifier = IS_MAC ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;

			if (!modifier || !event.shiftKey || event.key.toLowerCase() !== "f") return;
			if ((rootRef.current?.getClientRects().length ?? 0) === 0) return;

			event.preventDefault();
			activateSearch();
		};

		globalThis.addEventListener("keydown", onKeyDown, true);
		return () => globalThis.removeEventListener("keydown", onKeyDown, true);
	}, [activateSearch]);

	const views: SidebarView[] = [
		{
			id: "explorer",
			label: t(translation.ProjectTree.Explorer),
			icon: "folder",
			actions: editable ? (
				<ProjectTreeActions compact onCreateEntry={adapter.handleCreateEntry} />
			) : null,
			content: explorer,
		},
		{
			id: "search",
			label: t(translation.ProjectSearch.Title),
			icon: "search",
			content: (
				<ProjectSearchPane
					projectPath={projectPath}
					activePath={adapter.activeTab?.filePath ?? null}
					focusNonce={searchFocusNonce}
					onOpenMatch={(file, match) =>
						adapter.handleOpenSearchMatch(file.absolutePath, file.name, match.line)
					}
				/>
			),
		},
	];

	if (renderGitPane) {
		views.push({
			id: "git",
			label: t(translation.GitStatus.Title),
			icon: "activity",
			actions: (
				<Tooltip content={t(translation.ProjectTree.GitInfo)} side="bottom">
					<button
						type="button"
						onClick={() => adapter.setShowGitInfo(true)}
						aria-label={t(translation.ProjectTree.GitInfo)}
						className="flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-accent/10 hover:text-accent"
					>
						<UiIcon name="journal-page" className="h-3.5 w-3.5" />
					</button>
				</Tooltip>
			),
			content: renderGitPane({
				busy,
				gitStatus: adapter.gitStatus,
				loading: adapter.gitStatusLoading,
				selectedPath: adapter.activeTab?.filePath ?? null,
				onSelect: adapter.handleOpenDiff,
				projectPath,
				onBranchSwitched: adapter.refreshGitStatus,
			}),
		});
	}

	return (
		<div ref={rootRef} className="h-full">
			<WorkbenchLeftPanel
				activeId={adapter.activePanel}
				onChange={(id) => setActivePanel(id as SidebarPanelId)}
				views={views}
			/>
		</div>
	);
}
