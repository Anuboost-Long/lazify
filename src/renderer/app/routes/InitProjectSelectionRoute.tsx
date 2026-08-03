import { appRoute } from "@renderer/app/app-routes";
import { InitProjectSelectionPage } from "@renderer/features/init/pages/InitProjectSelectionPage";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";
import { useNavigate } from "react-router-dom";

export function InitProjectSelectionRoute() {
  const navigate = useNavigate();
  const {
    importedTemplateOptions,
    initSourceMode,
    selectedImportedTemplateId,
    selectedTemplateId,
    templateOptions,
    loadImportedTemplate,
    setInitSourceMode,
    setSelectedTemplateId,
  } = useLazifyStore();

  const handleSourceMode = (value: "stack" | "imported") => {
    setInitSourceMode(value);
    if (value === "stack") {
      void loadImportedTemplate("");
    } else {
      setSelectedTemplateId("");
    }
  };

  return (
    <InitProjectSelectionPage
      importedTemplateOptions={importedTemplateOptions}
      sourceMode={initSourceMode}
      selectedImportedTemplateId={selectedImportedTemplateId}
      selectedTemplateId={selectedTemplateId}
      templateOptions={templateOptions}
      onSelectSourceMode={handleSourceMode}
      onSelectTemplate={(templateId) => {
        setSelectedTemplateId(templateId);
        if (templateId) navigate(appRoute.initProjectSetup);
      }}
      onSelectImportedTemplate={(templateId) => {
        void loadImportedTemplate(templateId).then(() => {
          if (templateId) navigate(appRoute.initProjectSetup);
        });
      }}
    />
  );
}
