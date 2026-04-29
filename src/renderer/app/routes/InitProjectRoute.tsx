import { InitProjectPage } from "@renderer/features/workspace/pages/InitProjectPage";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";

export function InitProjectRoute() {
  const {
    busy,
    initWorkflowStage,
    packageName,
    projectDirectory,
    projectName,
    savedInitWorkflowConfig,
    setSavedStructureTree,
    selectedStructurePaths,
    selectedTemplateId,
    templateOptions,
    setPackageName,
    setProjectName,
    setInitWorkflowStage,
    setSelectedStructurePaths,
    setSelectedTemplateId,
    pickProjectDirectory,
    createProject,
    continueInitWorkflow
  } = useLazifyStore();

  return (
    <InitProjectPage
      busy={busy}
      onCreateProject={() => void createProject()}
      initWorkflowStage={initWorkflowStage}
      packageName={packageName}
      projectDirectory={projectDirectory}
      projectName={projectName}
      savedInitWorkflowConfig={savedInitWorkflowConfig}
      selectedStructurePaths={selectedStructurePaths}
      selectedTemplateId={selectedTemplateId}
      templateOptions={templateOptions}
      onProjectNameChange={setProjectName}
      onPackageNameChange={setPackageName}
      onBrowseDirectory={() => void pickProjectDirectory()}
      onContinue={() => void continueInitWorkflow()}
      onToggleStructurePath={(path) =>
        setSelectedStructurePaths((current) =>
          current.includes(path)
            ? current.filter((item) => item !== path)
            : [...current, path]
        )
      }
      onSelectTemplate={setSelectedTemplateId}
      onChangeStack={() => setSelectedTemplateId("")}
      onBackToConfig={() => setInitWorkflowStage("configure")}
      onStructureTreeChange={setSavedStructureTree}
    />
  );
}
