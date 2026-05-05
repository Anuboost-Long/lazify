import { translation } from "@renderer/i18n/translation";
import { ProjectTreeEditorPanel } from "@renderer/shared/ui/project-tree/ProjectTreeEditorPanel";
import type { TreeNode } from "@renderer/shared/ui/project-tree/types";
import type { ImportedTemplateSnapshot } from "@renderer/shared/types/lazify";
import { useTranslation } from "react-i18next";

interface ProjectViewPanelProps {
  busy: boolean;
  importedTemplate: ImportedTemplateSnapshot | null;
  sourceMode?: "stack" | "imported";
  projectName: string;
  templateId: string;
  templateLabel: string;
  selectedStructurePaths: string[];
  savedTree: TreeNode[] | null;
  onTreeChange: (tree: TreeNode[]) => void;
}

export function ProjectViewPanel({
  busy,
  importedTemplate,
  sourceMode = "stack",
  projectName,
  templateId,
  templateLabel,
  selectedStructurePaths,
  savedTree,
  onTreeChange
}: ProjectViewPanelProps) {
  const { t } = useTranslation();

  return (
    <ProjectTreeEditorPanel
      busy={busy}
      eyebrow={t(translation.ProjectTree.ProjectView)}
      title={t(translation.ProjectTree.ProjectViewTitle)}
      description={t(translation.ProjectTree.ProjectViewDesc)}
      projectName={projectName}
      templateId={templateId}
      templateLabel={templateLabel}
      selectedStructurePaths={selectedStructurePaths}
      initialTree={savedTree ?? importedTemplate?.tree ?? null}
      useScaffoldBaseline={sourceMode === "stack"}
      onTreeChange={onTreeChange}
    />
  );
}
