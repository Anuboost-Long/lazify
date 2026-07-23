import { translation } from "@renderer/i18n/translation";
import type {
  ImportedTemplateOption,
  ImportedTemplateSnapshot,
  ProjectTreeNode,
  SavedInitWorkflowConfig,
  TemplateOption,
} from "@renderer/shared/types/lazify";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BodyText } from "@renderer/shared/typography";
import { useTranslation } from "react-i18next";
import { FileStructureSetupPanel } from "../components/file-structure-setup/FileStructureSetupPanel";
import { ImportedTemplatePicker } from "../components/ImportedTemplatePicker";
import { SourceModeCard } from "../components/SourceModeCard";
import { StackPicker } from "../components/StackPicker";
import { TemplateOptionsPanel } from "../components/TemplateOptionsPanel";
import { WorkflowForm } from "../components/WorkflowForm";

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
  createOptionValues: Record<string, boolean>;
  onCreateOptionChange: (key: string, value: boolean) => void;
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
  onStructureTreeChange,
  createOptionValues,
  onCreateOptionChange,
}: Readonly<InitProjectPageProps>) {
  const { t } = useTranslation();
  const hasSelection =
    initSourceMode === "stack"
      ? Boolean(selectedTemplateId)
      : Boolean(selectedImportedTemplateId);
  const inStructureStage = initWorkflowStage === "structure";
  const selectedLabel =
    initSourceMode === "stack"
      ? (templateOptions.find((template) => template.id === selectedTemplateId)
          ?.label ?? t(translation.InitProject.SelectedStack))
      : (selectedImportedTemplate?.name ??
        t(translation.Templates.ImportedTemplate));

  return (
    <div className="flex flex-col gap-6">
      {/* The page's name and icon are in the shell's top bar. What is not up
          there is which stage you are in, so that line alone stays. */}
      <BodyText className="text-muted">
        {inStructureStage
          ? t(translation.InitProject.DescriptionStructure)
          : initSourceMode === "imported"
            ? t(translation.InitProject.DescriptionImported)
            : t(translation.InitProject.DescriptionStack)}
      </BodyText>

      {!inStructureStage && !hasSelection ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <SourceModeCard
            active={initSourceMode === "stack"}
            icon="play"
            eyebrow={t(translation.InitProject.FreshScaffold)}
            title={t(translation.InitProject.StartFromStack)}
            description={t(translation.InitProject.StartFromStackDesc)}
            metadata={t(translation.InitProject.ChooseRuntimeFirst)}
            onClick={() => onSelectSourceMode("stack")}
          />
          <SourceModeCard
            active={initSourceMode === "imported"}
            icon="import"
            eyebrow={t(translation.InitProject.SavedSnapshot)}
            title={t(translation.InitProject.UseImportedTemplate)}
            description={t(translation.InitProject.UseImportedTemplateDesc)}
            metadata={t(translation.InitProject.StartFromTemplate)}
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
              {t(translation.InitProject.ChangeSelection)}
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

          {!inStructureStage && initSourceMode === "stack" ? (
            <TemplateOptionsPanel
              options={
                templateOptions.find(
                  (template) => template.id === selectedTemplateId,
                )?.createOptions ?? []
              }
              values={createOptionValues}
              busy={busy}
              onChange={onCreateOptionChange}
            />
          ) : null}
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
