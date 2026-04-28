import { WorkflowForm } from "@renderer/features/workspace/components/WorkflowForm";
import { PageHeader } from "@renderer/shared/ui/PageHeader";
import { StatusStrip } from "@renderer/shared/ui/StatusStrip";
import { TechStackStrip } from "@renderer/shared/ui/TechStackStrip";
import type {
  EnvironmentSummary,
  TemplateOption,
  WorkflowStatus,
} from "@renderer/shared/types/lazify";

interface WorkspacePageProps {
  busy: boolean;
  environment: EnvironmentSummary | null;
  packageName: string;
  projectDirectory: string;
  projectName: string;
  selectedTemplateId: string;
  statusMessage: string;
  templateOptions: TemplateOption[];
  workflowStatus: WorkflowStatus;
  onProjectNameChange: (value: string) => void;
  onPackageNameChange: (value: string) => void;
  onTemplateChange: (value: string) => void;
  onBrowseDirectory: () => void;
  onCreateExpoApp: () => void;
  onInstallPackage: () => void;
}

export function WorkspacePage({
  busy,
  environment,
  packageName,
  projectDirectory,
  projectName,
  selectedTemplateId,
  statusMessage,
  templateOptions,
  workflowStatus,
  onProjectNameChange,
  onPackageNameChange,
  onTemplateChange,
  onBrowseDirectory,
  onCreateExpoApp,
  onInstallPackage,
}: WorkspacePageProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Desktop Workflow Orchestrator"
        title="Workspace"
        description="Create projects, install dependencies, and manage your active setup flow from a dedicated workspace page."
        icon="folder"
      />

      <StatusStrip
        environment={environment}
        workflowStatus={workflowStatus}
        statusMessage={statusMessage}
      />

      <TechStackStrip />

      <WorkflowForm
        projectName={projectName}
        projectDirectory={projectDirectory}
        packageName={packageName}
        selectedTemplateId={selectedTemplateId}
        templateOptions={templateOptions}
        busy={busy}
        onProjectNameChange={onProjectNameChange}
        onPackageNameChange={onPackageNameChange}
        onTemplateChange={onTemplateChange}
        onBrowseDirectory={onBrowseDirectory}
        onCreateExpoApp={onCreateExpoApp}
        onInstallPackage={onInstallPackage}
      />
    </div>
  );
}
