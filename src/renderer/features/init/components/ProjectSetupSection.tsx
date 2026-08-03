import { translation } from "@renderer/i18n/translation";
import type { TemplateOption } from "@renderer/shared/types/lazify";
import { useTranslation } from "react-i18next";
import { WorkflowForm } from "./WorkflowForm";

interface ProjectSetupSectionProps {
  busy: boolean;
  sourceMode: "stack" | "imported";
  sourceLabel: string;
  onChangeSelection: () => void;
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
}

/**
 * Phase 2 of init: a source is chosen, then its project details are collected.
 */
export function ProjectSetupSection({
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
}: Readonly<ProjectSetupSectionProps>) {
  const { t } = useTranslation();
  const changeSelectionLabel = t(translation.InitProject.ChangeSelection);

  return (
    <WorkflowForm
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
