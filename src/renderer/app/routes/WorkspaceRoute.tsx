import { WorkspacePage } from "@renderer/features/workspace/pages/WorkspacePage";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";

export function WorkspaceRoute() {
  const {
    busy,
    initSourceMode,
    projectName,
    savedInitWorkflowConfig,
    savedStructureTree,
    selectedImportedTemplate,
    selectedStructurePaths,
    selectedTemplateId,
    templateOptions,
    setSavedStructureTree
  } = useLazifyStore();

  const activeTemplateId = savedInitWorkflowConfig?.templateId ?? selectedTemplateId;
  const activeProjectName = savedInitWorkflowConfig?.projectName ?? projectName;
  const sourceMode = savedInitWorkflowConfig?.sourceMode ?? initSourceMode;
  const templateLabel =
    sourceMode === "imported"
      ? selectedImportedTemplate?.name ?? "Imported template"
      : templateOptions.find((template) => template.id === activeTemplateId)?.label ?? "Template";

  return (
    <WorkspacePage
      busy={busy}
      importedTemplate={selectedImportedTemplate}
      projectName={activeProjectName}
      sourceMode={sourceMode}
      templateId={activeTemplateId ?? ""}
      templateLabel={templateLabel}
      selectedStructurePaths={selectedStructurePaths}
      savedTree={savedStructureTree}
      onTreeChange={setSavedStructureTree}
    />
  );
}
