import type { StarterFailureReason } from "@main/starter-provisioner";
import { translation } from "@renderer/i18n/translation";
import type {
  ImportedTemplateSnapshot,
  ProjectTreeNode,
  SavedInitWorkflowConfig,
  TemplateOption,
} from "@renderer/shared/types/lazify";
import { BackButton } from "@renderer/shared/ui/BackButton";
import { useTranslation } from "react-i18next";
import { InitPhase } from "../pages/init-phase";
import { FileStructureSetupPanel } from "./file-structure-setup/FileStructureSetupPanel";
import { WorkflowForm } from "./WorkflowForm";

interface ProjectSetupSectionProps {
  /** Either {@link InitPhase.Configure} or {@link InitPhase.Structure}. */
  phase: InitPhase.Configure | InitPhase.Structure;
  busy: boolean;
  sourceMode: "stack" | "imported";
  sourceLabel: string;
  onChangeSelection: () => void;
  // Configure stage
  projectName: string;
  projectDirectory: string;
  packageName: string;
  selectedTemplateId: string;
  templateOptions: TemplateOption[];
  onProjectNameChange: (value: string) => void;
  onPackageNameChange: (value: string) => void;
  onBrowseDirectory: () => void;
  onContinue: () => void;
  createOptionValues: Record<string, boolean>;
  onCreateOptionChange: (key: string, value: boolean) => void;
  // Structure stage
  savedInitWorkflowConfig: SavedInitWorkflowConfig | null;
  selectedImportedTemplate: ImportedTemplateSnapshot | null;
  preparedTree: ProjectTreeNode[] | null;
  starterFailureReason: StarterFailureReason | null;
  preparedOptionalFolders: { path: string; label: string }[];
  selectedStructurePaths: string[];
  onBackToConfig: () => void;
  onCreateProject: () => void;
  onStructureTreeChange: (tree: ProjectTreeNode[]) => void;
  onToggleStructurePath: (path: string) => void;
}

/**
 * Phase 2 of init: a source is chosen. Collects project details in the
 * configure stage, then arranges the file structure in the structure stage.
 */
export function ProjectSetupSection({
  phase,
  busy,
  sourceMode,
  sourceLabel,
  onChangeSelection,
  projectName,
  projectDirectory,
  packageName,
  selectedTemplateId,
  templateOptions,
  onProjectNameChange,
  onPackageNameChange,
  onBrowseDirectory,
  onContinue,
  createOptionValues,
  onCreateOptionChange,
  savedInitWorkflowConfig,
  preparedTree,
  starterFailureReason,
  preparedOptionalFolders,
  selectedImportedTemplate,
  selectedStructurePaths,
  onBackToConfig,
  onCreateProject,
  onStructureTreeChange,
  onToggleStructurePath,
}: Readonly<ProjectSetupSectionProps>) {
  const { t } = useTranslation();
  const changeSelectionLabel = t(translation.InitProject.ChangeSelection);

  // Structure stage: the tree editor carries its own header, so the "change
  // selection" back link rides above it as a breadcrumb.
  if (phase === InitPhase.Structure) {
    return savedInitWorkflowConfig ? (
      <div className="flex flex-col gap-3">
        <BackButton
          label={changeSelectionLabel}
          onClick={onChangeSelection}
        />
        <FileStructureSetupPanel
          busy={busy}
          importedTemplate={selectedImportedTemplate}
          preparedTree={preparedTree}
          preparedOptionalFolders={preparedOptionalFolders}
          savedConfig={savedInitWorkflowConfig}
          selectedStructurePaths={selectedStructurePaths}
          templateOptions={templateOptions}
          onBackToConfig={onBackToConfig}
          onCreateProject={onCreateProject}
          onTreeChange={onStructureTreeChange}
          onToggleStructurePath={onToggleStructurePath}
        />
      </div>
    ) : null;
  }

  // Configure stage: the back link lives inside the form's hero header.
  return (
    <WorkflowForm
      starterFailureReason={starterFailureReason}
      sourceMode={sourceMode}
      sourceLabel={sourceLabel}
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
      createOptionValues={createOptionValues}
      onCreateOptionChange={onCreateOptionChange}
      onBack={onChangeSelection}
      backLabel={changeSelectionLabel}
    />
  );
}
