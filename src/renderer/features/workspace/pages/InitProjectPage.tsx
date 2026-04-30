import clsx from "clsx";
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

function SourceModeCard({
  active,
  title,
  description,
  onClick
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-[24px] border p-5 text-left transition",
        active ? "border-accent bg-accentSoft shadow-glow" : "border-border bg-soft hover:border-accent"
      )}
    >
      <p className="text-base font-semibold text-text">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
    </button>
  );
}

function ImportedTemplatePicker({
  templates,
  selectedTemplateId,
  onSelect
}: {
  templates: ImportedTemplateOption[];
  selectedTemplateId: string;
  onSelect: (templateId: string) => void;
}) {
  if (templates.length === 0) {
    return (
      <section className="rounded-[24px] border border-border bg-soft p-6 shadow-panel">
        <p className="text-sm leading-6 text-muted">
          No imported templates have been saved yet. Use Import Project first, then save one as JSON.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {templates.map((template) => {
        const active = template.id === selectedTemplateId;

        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template.id)}
            className={clsx(
              "rounded-[24px] border p-5 text-left transition",
              active ? "border-accent bg-accentSoft shadow-glow" : "border-border bg-soft hover:border-accent"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-text">{template.name}</p>
                <p className="mt-2 text-sm text-muted">{template.description}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-accent">
                  {template.fileCount} files
                </p>
                <p className="mt-2 text-xs leading-5 text-muted">{template.sourceProjectPath}</p>
              </div>
              {active ? (
                <div className="rounded-full border border-border bg-accentSoft px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  Selected
                </div>
              ) : null}
            </div>
          </button>
        );
      })}
    </section>
  );
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
            title="Start from stack"
            description="Pick Expo, Next.js, Vite, or another stack and generate a fresh project baseline."
            onClick={() => onSelectSourceMode("stack")}
          />
          <SourceModeCard
            active={initSourceMode === "imported"}
            title="Use imported template"
            description="Reuse a previously imported project template saved as JSON from the Import Project flow."
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
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-soft px-4 py-2 text-sm font-semibold text-muted transition hover:border-accent hover:text-text"
            >
              <UiIcon
                name="arrow-left"
                className="h-4 w-4 text-muted transition group-hover:text-accent"
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
