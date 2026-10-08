import { ImportTemplatePage } from "@/features/templates/pages/ImportTemplatePage";
import { appRoute, getTemplateEditRoute } from "@/app/app-routes";
import { useNavigate } from "react-router-dom";

export function ImportTemplateRoute() {
  const navigate = useNavigate();

  return (
    <ImportTemplatePage
      onBack={() => navigate(appRoute.templates)}
      onTemplateSaved={async (templateId) => {
        navigate(getTemplateEditRoute(templateId));
      }}
    />
  );
}
