import { useTranslation } from "react-i18next";

import { CaptionText } from "@renderer/shared/typography";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
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
  onSelect
}: Readonly<ProjectPickerListProps>) {
  const { t } = useTranslation();

  return (
    <>
      {projects.map((project, index) => (
        <ProjectPickerItem
          key={project.projectPath}
          project={project}
          index={index}
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
