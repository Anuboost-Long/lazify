import { ProjectTreeEditorPanel } from "@renderer/shared/ui/project-tree/ProjectTreeEditorPanel";
import type { TreeNode } from "@renderer/shared/ui/project-tree/types";

interface ProjectViewPanelProps {
  busy: boolean;
  projectName: string;
  templateId: string;
  templateLabel: string;
  selectedStructurePaths: string[];
  savedTree: TreeNode[] | null;
  onTreeChange: (tree: TreeNode[]) => void;
}

export function ProjectViewPanel({
  busy,
  projectName,
  templateId,
  templateLabel,
  selectedStructurePaths,
  savedTree,
  onTreeChange
}: ProjectViewPanelProps) {
  return (
    <ProjectTreeEditorPanel
      busy={busy}
      eyebrow="Project view"
      title="Inspect and shape the project tree"
      description="This view reuses the explorer and editor experience from setup, without module toggles. Use it as a focused project tree workspace for upcoming functionality."
      projectName={projectName}
      templateId={templateId}
      templateLabel={templateLabel}
      selectedStructurePaths={selectedStructurePaths}
      initialTree={savedTree}
      onTreeChange={onTreeChange}
    />
  );
}
