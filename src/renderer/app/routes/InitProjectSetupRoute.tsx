import { appRoute } from "@renderer/app/app-routes";
import { InitProjectSetupPage } from "@renderer/features/init/pages/InitProjectSetupPage";
import { translation } from "@renderer/i18n/translation";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function InitProjectSetupRoute() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    busy,
    initSourceMode,
    packageName,
    projectDirectory,
    projectName,
    selectedImportedTemplate,
    selectedImportedTemplateId,
    selectedTemplateId,
    templateOptions,
    loadImportedTemplate,
    setPackageName,
    setProjectName,
    setSelectedTemplateId,
    pickProjectDirectory,
    createProject,
    createOptionValues,
    setCreateOptionValues,
  } = useLazifyStore();
  const hasSelection =
    initSourceMode === "stack"
      ? Boolean(selectedTemplateId)
      : Boolean(selectedImportedTemplateId);

  if (!hasSelection) {
    return <Navigate to={appRoute.initProject} replace />;
  }

  const sourceLabel =
    initSourceMode === "stack"
      ? (templateOptions.find((template) => template.id === selectedTemplateId)
          ?.label ?? t(translation.InitProject.SelectedStack))
      : (selectedImportedTemplate?.name ?? t(translation.Templates.ImportedTemplate));

  return (
    <InitProjectSetupPage
      busy={busy}
      sourceMode={initSourceMode}
      sourceLabel={sourceLabel}
      projectName={projectName}
      projectDirectory={projectDirectory}
      packageName={packageName}
      selectedTemplateId={selectedTemplateId}
      templateOptions={templateOptions}
      createOptionValues={createOptionValues}
      onChangeSelection={() => {
        if (initSourceMode === "stack") {
          setSelectedTemplateId("");
        } else {
          void loadImportedTemplate("");
        }
        navigate(appRoute.initProject);
      }}
      onProjectNameChange={setProjectName}
      onPackageNameChange={setPackageName}
      onBrowseDirectory={() => void pickProjectDirectory()}
      onContinue={() => {
        void createProject();
        navigate(appRoute.initProjectProgress);
      }}
      onCreateOptionChange={(key, value) =>
        setCreateOptionValues((current) => ({ ...current, [key]: value }))
      }
    />
  );
}
