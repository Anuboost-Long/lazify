import { useTranslation } from "react-i18next";

import type { SyncedWorkspaceProject } from "@/shared/types/lazify";
import { CaptionText } from "@/shared/typography";

import { ProjectPickerItem } from "./ProjectPickerItem";

interface ProjectPickerListProps {
	projects: SyncedWorkspaceProject[];
	selectedPath?: string;
	emptyMessage?: string;
	onSelect: (project: SyncedWorkspaceProject) => void;
}

export function ProjectPickerList({
	projects,
	selectedPath = "",
	emptyMessage,
	onSelect,
}: Readonly<ProjectPickerListProps>) {
	const { t } = useTranslation();

	return (
		<>
			{projects.map((project) => (
				<ProjectPickerItem
					key={project.projectPath}
					project={project}
					active={project.projectPath === selectedPath}
					onSelect={() => onSelect(project)}
				/>
			))}

			{projects.length === 0 && emptyMessage ? (
				<CaptionText tone="muted" className="col-span-full block px-3 py-8 text-center">
					{t(emptyMessage)}
				</CaptionText>
			) : null}
		</>
	);
}
