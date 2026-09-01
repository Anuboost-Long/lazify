import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { Task } from "@main/tasks/types";
import { translation } from "@renderer/i18n/translation";
import { formatStackLabel } from "@renderer/shared/lib/stack-label";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import { CaptionText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface ProjectsPanelProps {
	projects: SyncedWorkspaceProject[];
	tasks: Task[];
	activeProjectPath: string | null;
	onOpenProject: (projectPath: string) => void;
	onOpenWorkspace: () => void;
}

export function ProjectsPanel({
	projects,
	tasks,
	activeProjectPath,
	onOpenProject,
	onOpenWorkspace,
}: Readonly<ProjectsPanelProps>) {
	const { t } = useTranslation();

	return (
		<div className="flex min-h-full flex-col">
			{projects.length > 0 ? (
				<div className="divide-y divide-border">
					{projects.map((project) => {
						const projectTasks = tasks.filter((task) => task.projectPath === project.projectPath);
						const done = projectTasks.filter((task) => task.status === "done").length;
						const progress =
							projectTasks.length === 0 ? 0 : Math.round((done / projectTasks.length) * 100);
						const active = project.projectPath === activeProjectPath;

						return (
							<button
								key={project.id}
								type="button"
								onClick={() => onOpenProject(project.projectPath)}
								className={clsx(
									"group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors",
									active ? "bg-accent/5" : "bg-transparent",
									"hover:bg-text/5",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50",
								)}
							>
								<span
									className={clsx(
										"flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border",
										active
											? "border-accent/30 bg-accent/10 text-accent"
											: "border-border bg-bg/50 text-muted group-hover:text-text",
									)}
								>
									<UiIcon name="folder" filled={active} className="h-4 w-4" />
								</span>

								<span className="min-w-0 flex-1">
									<span className="block truncate text-sm font-semibold text-text">
										{project.projectName}
									</span>
									<CaptionText tone="muted" className="mt-1 block truncate">
										{formatStackLabel(project.stack)}
									</CaptionText>
								</span>

								<span className="w-12 shrink-0 text-right">
									<span className="text-xs font-semibold tabular-nums text-text">{progress}%</span>
									<span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-text/10">
										<span style={{ width: `${progress}%` }} className="block h-full rounded-full bg-accent" />
									</span>
								</span>
							</button>
						);
					})}
				</div>
			) : (
				<div className="px-5 py-10 text-center">
					<UiIcon name="folder-plus" className="mx-auto h-6 w-6 text-muted" />
					<CaptionText tone="muted" className="mt-3">
						{t(translation.Workspace.NoSyncedYet)}
					</CaptionText>
				</div>
			)}

			<button
				type="button"
				onClick={onOpenWorkspace}
				className={clsx(
					"mt-auto flex w-full items-center justify-between border-t border-border px-4 py-3",
					"text-xs font-semibold text-muted transition-colors hover:bg-text/5 hover:text-text",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50",
				)}
			>
				{t(translation.Navigation.Workspace)}
				<UiIcon name="arrow-right" className="h-3.5 w-3.5" />
			</button>
		</div>
	);
}
