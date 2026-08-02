import { appRoute } from "@renderer/app/app-routes";
import { toEditableTree } from "@renderer/features/init/lib/prepared-project-tree";
import { InitProjectPage } from "@renderer/features/init/pages/InitProjectPage";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

/** A shared empty array, so "no optional folders" is not a new value each render. */
const NO_OPTIONAL_FOLDERS: { path: string; label: string }[] = [];

export function InitProjectRoute() {
  const navigate = useNavigate();
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
    continueInitWorkflow,
    preparedProject,
    discardPreparedProject,
    starterFailureReason,
    createOptionValues,
    setCreateOptionValues
  } = useLazifyStore();

  // Must keep its identity between renders. The tree editor re-syncs whenever
  // `initialTree` changes, and a fresh array every render made it re-sync
  // forever — which reset the scroll position to the selected row on every
  // pass and left the list unusable.
  const preparedTree = useMemo(
    () =>
      preparedProject
        ? toEditableTree(preparedProject.indexTree, preparedProject.required)
        : null,
    [preparedProject]
  );

  return (
    <InitProjectPage
      busy={busy}
      preparedTree={preparedTree}
      preparedOptionalFolders={preparedProject?.optionalFolders ?? NO_OPTIONAL_FOLDERS}
      starterFailureReason={starterFailureReason}
      onCreateProject={() => { void createProject(); navigate(appRoute.console); }}
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
      createOptionValues={createOptionValues}
      onCreateOptionChange={(key, value) =>
        setCreateOptionValues((current) => ({ ...current, [key]: value }))
      }
      onSelectSourceMode={setInitSourceMode}
      onProjectNameChange={setProjectName}
      onPackageNameChange={setPackageName}
      onBrowseDirectory={() => void pickProjectDirectory()}
      onContinue={() => {
        // Watch the work happen on the console, then come back — to the
        // structure step if it worked, or to the failure notice if it did not.
        let showedConsole = false;

        void continueInitWorkflow(() => {
          showedConsole = true;
          navigate(appRoute.console);
        }).finally(() => {
          if (showedConsole) {
            navigate(appRoute.initProject);
          }
        });
      }}
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
        // The prepared tree is already on disk, so leaving the structure step
        // has to clean it up rather than only moving the stage back.
        void discardPreparedProject();

        if (initSourceMode === "stack") {
          setSelectedTemplateId("");
          return;
        }

        void loadImportedTemplate("");
      }}
      onBackToConfig={() => void discardPreparedProject()}
      onStructureTreeChange={setSavedStructureTree}
    />
  );
}
