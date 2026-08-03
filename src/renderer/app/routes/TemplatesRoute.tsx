import { TemplatesPage } from "@renderer/features/templates/pages/TemplatesPage";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";
import { appRoute, getTemplateEditRoute } from "../app-routes";
import { useNavigate } from "react-router-dom";

export function TemplatesRoute() {
  const navigate = useNavigate();
  const {
    importedTemplateOptions,
    removeImportedTemplate,
  } = useLazifyStore();

  return (
    <TemplatesPage
      importedTemplateOptions={importedTemplateOptions}
      onSelectTemplate={(templateId) => navigate(getTemplateEditRoute(templateId))}
      onDeleteTemplate={(templateId) => removeImportedTemplate(templateId)}
      onImportProject={() => navigate(appRoute.templateImport)}
    />
  );
}
