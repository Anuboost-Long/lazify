import { translation } from "@renderer/i18n/translation";
import type {
  ImportedTemplateOption,
  ImportedTemplateSnapshot,
  ProjectTreeNode,
  SavedInitWorkflowConfig,
  TemplateOption,
} from "@renderer/shared/types/lazify";
import { BodyText } from "@renderer/shared/typography";
import { useTranslation } from "react-i18next";
import { ProjectSetupSection } from "../components/ProjectSetupSection";
import { SourceSelectionSection } from "../components/SourceSelectionSection";
import { InitPhase, resolveInitPhase } from "./init-phase";

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

  const inStructureStage = initWorkflowStage === "structure";
  const hasSelection =
    initSourceMode === "stack"
      ? Boolean(selectedTemplateId)
      : Boolean(selectedImportedTemplateId);
  const phase = resolveInitPhase({
    hasSelection,
    inStructureStage,
    savedInitWorkflowConfig,
  });
  const selectedLabel =
    initSourceMode === "stack"
      ? (templateOptions.find((template) => template.id === selectedTemplateId)
          ?.label ?? t(translation.InitProject.SelectedStack))
      : (selectedImportedTemplate?.name ??
        t(translation.Templates.ImportedTemplate));

  function renderPhase() {
    switch (phase) {
      case InitPhase.Selection:
        return (
          <SourceSelectionSection
            showSourceModes={!inStructureStage}
            sourceMode={initSourceMode}
            onSelectSourceMode={onSelectSourceMode}
            templateOptions={templateOptions}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={onSelectTemplate}
            importedTemplateOptions={importedTemplateOptions}
            selectedImportedTemplateId={selectedImportedTemplateId}
            onSelectImportedTemplate={onSelectImportedTemplate}
          />
        );
      case InitPhase.Configure:
      case InitPhase.Structure:
        return (
          <ProjectSetupSection
            phase={phase}
            busy={busy}
            sourceMode={initSourceMode}
            sourceLabel={selectedLabel}
            onChangeSelection={onChangeSelection}
            projectName={projectName}
            projectDirectory={projectDirectory}
            packageName={packageName}
            selectedTemplateId={selectedTemplateId}
            templateOptions={templateOptions}
            onProjectNameChange={onProjectNameChange}
            onPackageNameChange={onPackageNameChange}
            onBrowseDirectory={onBrowseDirectory}
            onContinue={onContinue}
            createOptionValues={createOptionValues}
            onCreateOptionChange={onCreateOptionChange}
            savedInitWorkflowConfig={savedInitWorkflowConfig}
            selectedImportedTemplate={selectedImportedTemplate}
            selectedStructurePaths={selectedStructurePaths}
            onBackToConfig={onBackToConfig}
            onCreateProject={onCreateProject}
            onStructureTreeChange={onStructureTreeChange}
            onToggleStructurePath={onToggleStructurePath}
          />
        );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* The page's name and icon are in the shell's top bar. On the selection
          screen a one-line blurb says what you are choosing; once a source is
          picked, the hero header of each stage carries that context instead. */}
      {phase === InitPhase.Selection ? (
        <BodyText className="text-muted">
          {initSourceMode === "imported"
            ? t(translation.InitProject.DescriptionImported)
            : t(translation.InitProject.DescriptionStack)}
        </BodyText>
      ) : null}

      {renderPhase()}
    </div>
  );
}
