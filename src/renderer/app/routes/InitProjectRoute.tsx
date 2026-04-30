import { InitProjectPage } from "@renderer/features/workspace/pages/InitProjectPage";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";

export function InitProjectRoute() {
  const {
    busy,
    importedTemplateOptions,
    initSourceMode,
    initWorkflowStage,
    packageName,
    projectDirectory,
    projectName,
    savedInitWorkflowConfig,
    selectedImportedTemplate,
    selectedImportedTemplateId,
    setSavedStructureTree,
    selectedStructurePaths,
    selectedTemplateId,
    templateOptions,
    loadImportedTemplate,
    setInitSourceMode,
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
      importedTemplateOptions={importedTemplateOptions}
      initSourceMode={initSourceMode}
      initWorkflowStage={initWorkflowStage}
      packageName={packageName}
      projectDirectory={projectDirectory}
      projectName={projectName}
      savedInitWorkflowConfig={savedInitWorkflowConfig}
      selectedImportedTemplate={selectedImportedTemplate}
      selectedImportedTemplateId={selectedImportedTemplateId}
      selectedStructurePaths={selectedStructurePaths}
      selectedTemplateId={selectedTemplateId}
      templateOptions={templateOptions}
      onSelectSourceMode={setInitSourceMode}
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
      onSelectImportedTemplate={(templateId) => void loadImportedTemplate(templateId)}
      onChangeSelection={() => {
        setInitWorkflowStage("configure");

        if (initSourceMode === "stack") {
          setSelectedTemplateId("");
          return;
        }

        void loadImportedTemplate("");
      }}
      onBackToConfig={() => setInitWorkflowStage("configure")}
      onStructureTreeChange={setSavedStructureTree}
    />
  );
}
