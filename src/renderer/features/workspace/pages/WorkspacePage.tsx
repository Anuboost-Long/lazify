import { PageHeader } from "@renderer/shared/ui/PageHeader";
import { ProjectViewPanel } from "@renderer/features/workspace/components/project-view/ProjectViewPanel";
import type { ImportedTemplateSnapshot, ProjectTreeNode } from "@renderer/shared/types/lazify";

interface WorkspacePageProps {
  busy: boolean;
  importedTemplate: ImportedTemplateSnapshot | null;
  projectName: string;
  sourceMode?: "stack" | "imported";
  templateId: string;
  templateLabel: string;
  selectedStructurePaths: string[];
  savedTree: ProjectTreeNode[] | null;
  onTreeChange: (tree: ProjectTreeNode[]) => void;
}

export function WorkspacePage({
  busy,
  importedTemplate,
  projectName,
  sourceMode = "stack",
  templateId,
  templateLabel,
  selectedStructurePaths,
  savedTree,
  onTreeChange
}: WorkspacePageProps) {
  const hasProjectSource = Boolean(templateId || importedTemplate);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Desktop Workflow Orchestrator"
        title="Workspace"
        description="Workspace now hosts the reusable project tree view for follow-up functionality outside the init flow."
        icon="folder"
      />

      {hasProjectSource ? (
        <ProjectViewPanel
          busy={busy}
          importedTemplate={importedTemplate}
          sourceMode={sourceMode}
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
