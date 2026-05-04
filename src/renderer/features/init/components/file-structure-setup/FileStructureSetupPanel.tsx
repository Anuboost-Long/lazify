import { ProjectTreeEditorPanel } from "@renderer/shared/ui/project-tree/ProjectTreeEditorPanel";
import type { FileStructureSetupPanelProps } from "@renderer/shared/ui/project-tree/types";
import { useState } from "react";

export function FileStructureSetupPanel({
  busy,
  importedTemplate,
  savedConfig,
  selectedStructurePaths,
  templateOptions,
  onBackToConfig,
  onCreateProject,
  onTreeChange,
  onToggleStructurePath
}: FileStructureSetupPanelProps) {
  const [moduleSheetOpen, setModuleSheetOpen] = useState(false);
  const templateLabel =
    savedConfig.sourceMode === "imported"
      ? savedConfig.importedTemplateName ?? "Imported template"
      : templateOptions.find((template) => template.id === savedConfig.templateId)?.label ?? "Template";
  const templateId = savedConfig.sourceMode === "imported" ? "imported-template" : savedConfig.templateId ?? "";

  return (
    <ProjectTreeEditorPanel
      busy={busy}
      eyebrow="File structure"
      title="Configure the project tree like a real explorer"
      description="Your setup config is saved. Now edit the starter structure directly: add files, create folders, rename entries, and reshape the scaffold before generation."
      projectName={savedConfig.projectName}
      templateId={templateId}
      templateLabel={templateLabel}
      selectedStructurePaths={selectedStructurePaths}
      initialTree={importedTemplate?.tree ?? null}
      useScaffoldBaseline={savedConfig.sourceMode === "stack"}
      showModuleSelectionToggle={savedConfig.sourceMode === "stack"}
      primaryActionLabel="Create project"
      onPrimaryAction={onCreateProject}
      onTreeChange={onTreeChange}
      secondaryActionLabel="Back to config"
      onSecondaryAction={onBackToConfig}
      moduleSheet={{
        open: moduleSheetOpen,
        onOpen: () => setModuleSheetOpen(true),
        onClose: () => setModuleSheetOpen(false),
        onToggleStructurePath
      }}
    />
  );
}
