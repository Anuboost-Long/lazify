import { PageHeader } from "@renderer/shared/ui/PageHeader";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { ProjectTreeNode, SavedInitWorkflowConfig, TemplateOption } from "@renderer/shared/types/lazify";
import { FileStructureSetupPanel } from "../components/file-structure-setup/FileStructureSetupPanel";
import { WorkflowForm } from "../components/WorkflowForm";
import { StackPicker } from "../components/StackPicker";

interface InitProjectPageProps {
  busy: boolean;
  onCreateProject: () => void;
  initWorkflowStage: "configure" | "structure";
  packageName: string;
  projectDirectory: string;
  projectName: string;
  savedInitWorkflowConfig: SavedInitWorkflowConfig | null;
  selectedStructurePaths: string[];
  selectedTemplateId: string;
  templateOptions: TemplateOption[];
  onProjectNameChange: (value: string) => void;
  onPackageNameChange: (value: string) => void;
  onBrowseDirectory: () => void;
  onContinue: () => void;
  onToggleStructurePath: (path: string) => void;
  onSelectTemplate: (templateId: string) => void;
  onChangeStack: () => void;
  onBackToConfig: () => void;
  onStructureTreeChange: (tree: ProjectTreeNode[]) => void;
}

export function InitProjectPage({
  busy,
  onCreateProject,
  initWorkflowStage,
  packageName,
  projectDirectory,
  projectName,
  savedInitWorkflowConfig,
  selectedStructurePaths,
  selectedTemplateId,
  templateOptions,
  onProjectNameChange,
  onPackageNameChange,
  onBrowseDirectory,
  onContinue,
  onToggleStructurePath,
  onSelectTemplate,
  onChangeStack,
  onBackToConfig,
  onStructureTreeChange
}: InitProjectPageProps) {
  const hasSelectedTemplate = Boolean(selectedTemplateId);
  const inStructureStage = initWorkflowStage === "structure";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="New Workflow"
        title="Init Project"
        description={
          !hasSelectedTemplate
            ? "Choose one of the available stacks to start a new project."
            : inStructureStage
              ? "Set up the starter file structure for the project you just configured."
              : "Add the project details for the selected stack before moving to the next setup step."
        }
        icon="play"
      />

      {hasSelectedTemplate ? (
        <div className="flex flex-col gap-4">
          <div>
            <button
              type="button"
              onClick={onChangeStack}
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-soft px-4 py-2 text-sm font-semibold text-muted transition hover:border-accent hover:text-text"
            >
              <UiIcon
                name="arrow-left"
                className="h-4 w-4 text-muted transition group-hover:text-accent"
              />
              Change stack
            </button>
          </div>

          {inStructureStage && savedInitWorkflowConfig ? (
            <FileStructureSetupPanel
              busy={busy}
              savedConfig={savedInitWorkflowConfig}
              selectedStructurePaths={selectedStructurePaths}
              templateOptions={templateOptions}
              onBackToConfig={onBackToConfig}
              onCreateProject={onCreateProject}
              onTreeChange={onStructureTreeChange}
              onToggleStructurePath={onToggleStructurePath}
            />
          ) : (
            <WorkflowForm
              projectName={projectName}
              projectDirectory={projectDirectory}
              packageName={packageName}
              selectedTemplateId={selectedTemplateId}
              templateOptions={templateOptions}
              busy={busy}
              onProjectNameChange={onProjectNameChange}
              onPackageNameChange={onPackageNameChange}
              onBrowseDirectory={onBrowseDirectory}
              onContinue={onContinue}
            />
          )}
        </div>
      ) : (
        <StackPicker
          selectedTemplateId={selectedTemplateId}
          templateOptions={templateOptions}
          onSelect={onSelectTemplate}
        />
      )}
    </div>
  );
}
