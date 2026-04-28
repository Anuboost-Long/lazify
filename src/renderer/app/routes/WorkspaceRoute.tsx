import { WorkspacePage } from "@renderer/features/workspace/pages/WorkspacePage";
import { useAppShellContext } from "../app-shell-context";

export function WorkspaceRoute() {
  const {
    busy,
    environment,
    packageName,
    projectDirectory,
    projectName,
    selectedTemplateId,
    statusMessage,
    templateOptions,
    workflowStatus,
    pickProjectDirectory,
    setProjectName,
    setPackageName,
    setSelectedTemplateId,
    createProject,
    installPackage,
  } = useAppShellContext();

  return (
    <WorkspacePage
      busy={busy}
      environment={environment}
      packageName={packageName}
      projectDirectory={projectDirectory}
      projectName={projectName}
      selectedTemplateId={selectedTemplateId}
      statusMessage={statusMessage}
      templateOptions={templateOptions}
      workflowStatus={workflowStatus}
      onProjectNameChange={setProjectName}
      onPackageNameChange={setPackageName}
      onTemplateChange={setSelectedTemplateId}
      onBrowseDirectory={() => void pickProjectDirectory()}
      onCreateExpoApp={() => void createProject()}
      onInstallPackage={() => void installPackage()}
    />
  );
}
