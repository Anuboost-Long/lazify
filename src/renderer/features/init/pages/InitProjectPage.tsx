import { PageHeader } from "@renderer/shared/ui/PageHeader";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type {
  ImportedTemplateOption,
  ImportedTemplateSnapshot,
  ProjectTreeNode,
  SavedInitWorkflowConfig,
  TemplateOption
} from "@renderer/shared/types/lazify";
import { FileStructureSetupPanel } from "../components/file-structure-setup/FileStructureSetupPanel";
import { WorkflowForm } from "../components/WorkflowForm";
import { StackPicker } from "../components/StackPicker";
import { SourceModeCard } from "../components/SourceModeCard";
import { ImportedTemplatePicker } from "../components/ImportedTemplatePicker";

interface InitProjectPageProps {
  busy: boolean;
  onCreateProject: () => void;
  importedTemplateOptions: ImportedTemplateOption[];
  initSourceMode: "stack" | "imported";
  initWorkflowStage: "configure" | "structure";
  packageName: string;
  projectDirectory: string;
  projectName: string;
  savedInitWorkflowConfig: SavedInitWorkflowConfig | null;
  selectedImportedTemplate: ImportedTemplateSnapshot | null;
  selectedImportedTemplateId: string;
  selectedStructurePaths: string[];
  selectedTemplateId: string;
  templateOptions: TemplateOption[];
  onSelectSourceMode: (value: "stack" | "imported") => void;
  onProjectNameChange: (value: string) => void;
  onPackageNameChange: (value: string) => void;
  onBrowseDirectory: () => void;
  onContinue: () => void;
  onToggleStructurePath: (path: string) => void;
  onSelectTemplate: (templateId: string) => void;
  onSelectImportedTemplate: (templateId: string) => void;
  onChangeSelection: () => void;
  onBackToConfig: () => void;
  onStructureTreeChange: (tree: ProjectTreeNode[]) => void;
}

export function InitProjectPage({
  busy,
  onCreateProject,
  importedTemplateOptions,
  initSourceMode,
  initWorkflowStage,
  packageName,
  projectDirectory,
  projectName,
  savedInitWorkflowConfig,
  selectedImportedTemplate,
  selectedImportedTemplateId,
  selectedStructurePaths,
  selectedTemplateId,
  templateOptions,
  onSelectSourceMode,
  onProjectNameChange,
  onPackageNameChange,
  onBrowseDirectory,
  onContinue,
  onToggleStructurePath,
  onSelectTemplate,
  onSelectImportedTemplate,
  onChangeSelection,
  onBackToConfig,
  onStructureTreeChange
}: InitProjectPageProps) {
  const hasSelection =
    initSourceMode === "stack" ? Boolean(selectedTemplateId) : Boolean(selectedImportedTemplateId);
  const inStructureStage = initWorkflowStage === "structure";
  const selectedLabel =
    initSourceMode === "stack"
      ? templateOptions.find((template) => template.id === selectedTemplateId)?.label ?? "Selected stack"
      : selectedImportedTemplate?.name ?? "Imported template";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="New Workflow"
        title="Init Project"
        description={
          inStructureStage
            ? "Set up the starter file structure before generating the new project."
            : initSourceMode === "imported"
              ? "Choose one of your saved imported templates or switch back to stack-based setup."
              : "Start fresh with a stack, or switch to a saved imported template."
        }
        icon="play"
      />

      {!inStructureStage && !hasSelection ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <SourceModeCard
            active={initSourceMode === "stack"}
            icon="play"
            eyebrow="Fresh scaffold"
            title="Start from stack"
            description="Pick Expo, Next.js, Vite, or another stack and generate a fresh project baseline."
            metadata="Choose runtime first, then shape the scaffold before generation."
            onClick={() => onSelectSourceMode("stack")}
          />
          <SourceModeCard
            active={initSourceMode === "imported"}
            icon="import"
            eyebrow="Saved snapshot"
            title="Use imported template"
            description="Reuse a previously imported project template saved as JSON from the Import Project flow."
            metadata="Start from an approved template snapshot and keep its existing structure."
            onClick={() => onSelectSourceMode("imported")}
          />
        </section>
      ) : null}

      {hasSelection ? (
        <div className="flex flex-col gap-4">
          <div>
            <button
              type="button"
              onClick={onChangeSelection}
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-soft px-4 py-2 text-sm font-semibold text-muted hover:border-accent hover:text-text"
            >
              <UiIcon
                name="arrow-left"
                className="h-4 w-4 text-muted group-hover:text-accent"
              />
              Change selection
            </button>
          </div>

          {inStructureStage && savedInitWorkflowConfig ? (
            <FileStructureSetupPanel
              busy={busy}
              importedTemplate={selectedImportedTemplate}
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
              sourceMode={initSourceMode}
              sourceLabel={selectedLabel}
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
      ) : initSourceMode === "stack" ? (
        <StackPicker
          selectedTemplateId={selectedTemplateId}
          templateOptions={templateOptions}
          onSelect={onSelectTemplate}
        />
      ) : (
        <ImportedTemplatePicker
          templates={importedTemplateOptions}
          selectedTemplateId={selectedImportedTemplateId}
          onSelect={onSelectImportedTemplate}
        />
      )}
    </div>
  );
}
