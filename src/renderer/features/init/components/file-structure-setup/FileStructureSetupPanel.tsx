import { translation } from "@renderer/i18n/translation";
import { ProjectTreeEditorPanel } from "@renderer/shared/ui/project-tree/ProjectTreeEditorPanel";
import type { FileStructureSetupPanelProps } from "@renderer/shared/ui/project-tree/types";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function FileStructureSetupPanel({
  busy,
  importedTemplate,
  preparedTree,
  preparedOptionalFolders,
  savedConfig,
  selectedStructurePaths,
  templateOptions,
  onBackToConfig,
  onCreateProject,
  onTreeChange,
  onToggleStructurePath,
}: Readonly<FileStructureSetupPanelProps>) {
  const { t } = useTranslation();
  const [moduleSheetOpen, setModuleSheetOpen] = useState(false);
  const templateLabel =
    savedConfig.sourceMode === "imported"
      ? (savedConfig.importedTemplateName ??
        t(translation.Templates.ImportedTemplate))
      : (templateOptions.find(
          (template) => template.id === savedConfig.templateId,
        )?.label ?? t(translation.FileStructure.Template));
  const templateId =
    savedConfig.sourceMode === "imported"
      ? "imported-template"
      : (savedConfig.templateId ?? "");

  return (
    <ProjectTreeEditorPanel
      busy={busy}
      eyebrow={t(translation.FileStructure.Title)}
      title={t(translation.FileStructure.Subtitle)}
      description={t(translation.FileStructure.Desc)}
      projectName={savedConfig.projectName}
      templateId={templateId}
      templateLabel={templateLabel}
      selectedStructurePaths={selectedStructurePaths}
      initialTree={preparedTree ?? importedTemplate?.tree ?? null}
      // Only offered when the starter actually declares optional folders; there
      // is nothing to tick for a starter that ships everything it needs.
      showModuleSelectionToggle={
        savedConfig.sourceMode === "stack" && preparedOptionalFolders.length > 0
      }
      primaryActionLabel={t(translation.FileStructure.CreateProject)}
      onPrimaryAction={onCreateProject}
      onTreeChange={onTreeChange}
      secondaryActionLabel={t(translation.FileStructure.BackToConfig)}
      onSecondaryAction={onBackToConfig}
      moduleSheet={{
        options: preparedOptionalFolders,
        open: moduleSheetOpen,
        onOpen: () => setModuleSheetOpen(true),
        onClose: () => setModuleSheetOpen(false),
        onToggleStructurePath,
      }}
    />
  );
}
