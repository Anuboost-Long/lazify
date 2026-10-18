import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@/i18n/translation";
import type { SyncedWorkspaceProject } from "@/shared/types/lazify";
import { CaptionText } from "@/shared/typography";
import UiIcon from "@/shared/ui/icons/UiIcon";

interface RecentProjectsProps {
	projects: SyncedWorkspaceProject[];
	onOpenProject: (projectPath: string) => void;
}

export function RecentProjects({ projects, onOpenProject }: Readonly<RecentProjectsProps>) {
	const { t } = useTranslation();

	if (projects.length === 0) return null;

	return (
		<section aria-label={t(translation.Home.RecentProjects)} className="flex flex-col items-center gap-2">
			<CaptionText as="h2" tone="muted">
				{t(translation.Home.RecentProjects)}
			</CaptionText>
			<div className="flex max-w-2xl flex-wrap justify-center gap-2">
				{projects.map((project) => (
					<button
						key={project.id}
						type="button"
						title={project.projectPath}
						onClick={() => onOpenProject(project.projectPath)}
						className={clsx(
							"flex h-9 max-w-56 items-center gap-2 px-3",
							"rounded-xl border border-border bg-soft/60 backdrop-blur-xl",
							"text-sm font-medium text-text transition-colors hover:border-accent/40",
							"focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accentSoft",
						)}
					>
						<UiIcon name="folder" className="h-4 w-4 shrink-0 text-muted" />
						<span className="truncate">{project.projectName}</span>
					</button>
				))}
			</div>
		</section>
	);
}
