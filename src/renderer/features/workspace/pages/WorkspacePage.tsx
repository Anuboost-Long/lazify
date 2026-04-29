import { PageHeader } from "@renderer/shared/ui/PageHeader";
import { ProjectViewPanel } from "@renderer/features/workspace/components/project-view/ProjectViewPanel";
import type { ProjectTreeNode } from "@renderer/shared/types/lazify";

interface WorkspacePageProps {
  busy: boolean;
  projectName: string;
  templateId: string;
  templateLabel: string;
  selectedStructurePaths: string[];
  savedTree: ProjectTreeNode[] | null;
  onTreeChange: (tree: ProjectTreeNode[]) => void;
}

export function WorkspacePage({
  busy,
  projectName,
  templateId,
  templateLabel,
  selectedStructurePaths,
  savedTree,
  onTreeChange
}: WorkspacePageProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Desktop Workflow Orchestrator"
        title="Workspace"
        description="Workspace now hosts the reusable project tree view for follow-up functionality outside the init flow."
        icon="folder"
      />

      {templateId ? (
        <ProjectViewPanel
          busy={busy}
          projectName={projectName}
          templateId={templateId}
          templateLabel={templateLabel}
          selectedStructurePaths={selectedStructurePaths}
          savedTree={savedTree}
          onTreeChange={onTreeChange}
        />
      ) : (
        <section className="rounded-[24px] border border-border bg-soft p-6 shadow-panel">
          <p className="text-sm leading-6 text-muted">
            Start from Init Project to choose a stack before using project view.
          </p>
        </section>
      )}
    </div>
  );
}
