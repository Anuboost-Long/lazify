import { WorkspacePage } from "@renderer/features/workspace/pages/WorkspacePage";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";

export function WorkspaceRoute() {
  const {
    busy,
    projectName,
    savedInitWorkflowConfig,
    savedStructureTree,
    selectedStructurePaths,
    selectedTemplateId,
    templateOptions,
    setSavedStructureTree
  } = useLazifyStore();

  const activeTemplateId = savedInitWorkflowConfig?.templateId ?? selectedTemplateId;
  const activeProjectName = savedInitWorkflowConfig?.projectName ?? projectName;
  const templateLabel =
    templateOptions.find((template) => template.id === activeTemplateId)?.label ?? "Template";

  return (
    <WorkspacePage
      busy={busy}
      projectName={activeProjectName}
      templateId={activeTemplateId}
      templateLabel={templateLabel}
      selectedStructurePaths={selectedStructurePaths}
      savedTree={savedStructureTree}
      onTreeChange={setSavedStructureTree}
    />
  );
}
