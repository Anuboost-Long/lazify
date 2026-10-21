import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@/i18n/translation";
import type { SyncedWorkspaceProject } from "@/shared/types/lazify";
import { OverlineText } from "@/shared/typography";
import UiIcon from "@/shared/ui/icons/UiIcon";
import { Tooltip } from "@/shared/ui/Tooltip";

interface SidebarRecentProjectsProps {
	projects: SyncedWorkspaceProject[];
	openProjectPath: string | null;
	onOpenProject: (projectPath: string) => void;
	onAddProject: () => void;
}

export function SidebarRecentProjects({
	projects,
	openProjectPath,
	onOpenProject,
	onAddProject,
}: Readonly<SidebarRecentProjectsProps>) {
	const { t } = useTranslation();

	if (projects.length === 0) return null;

	return (
		<section aria-label={t(translation.Sidebar.RecentProjects)} className="mt-3 border-t border-border pt-3">
			<div className="mb-1 flex items-center justify-between pr-1 pl-3">
				<OverlineText className="whitespace-nowrap text-muted">{t(translation.Sidebar.RecentProjects)}</OverlineText>
				<Tooltip content={t(translation.Workspace.AddNewProject)} side="right">
					<button
						type="button"
						aria-label={t(translation.Workspace.AddNewProject)}
						onClick={onAddProject}
						className="flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-bg/40 hover:text-text"
					>
						<UiIcon name="plus" className="h-3.5 w-3.5" />
					</button>
				</Tooltip>
			</div>

			<div className="flex flex-col gap-0.5">
				{projects.map((project) => (
					<button
						key={project.id}
						type="button"
						title={project.projectPath}
						onClick={() => onOpenProject(project.projectPath)}
						className={clsx(
							"flex w-full items-center gap-3 rounded-lg px-3 py-1.5",
							"text-left text-sm",
							openProjectPath === project.projectPath
								? "bg-bg/60 text-text"
								: "text-muted hover:bg-bg/40 hover:text-text",
						)}
					>
						<UiIcon name="folder" className="h-4 w-4 shrink-0" />
						<span className="truncate">{project.projectName}</span>
					</button>
				))}
			</div>
		</section>
	);
}
