import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TemplateEditPage } from "@renderer/features/templates/pages/TemplateEditPage";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";
import { appRoute } from "../app-routes";

export function TemplateEditRoute() {
  const navigate = useNavigate();
  const { templateId = "" } = useParams();
  const [loadError, setLoadError] = useState<string | null>(null);
  const {
    selectedImportedTemplate,
    loadImportedTemplate,
    removeImportedTemplate,
    saveImportedTemplateChanges,
  } = useLazifyStore();

  useEffect(() => {
    if (!templateId) {
      navigate(appRoute.templates, { replace: true });
      return;
    }

    setLoadError(null);
    void loadImportedTemplate(templateId).catch((error) => {
      setLoadError(
        error instanceof Error ? error.message : "Unable to load this template."
      );
    });
  }, [loadImportedTemplate, navigate, templateId]);

  const activeTemplate =
    selectedImportedTemplate?.id === templateId
      ? selectedImportedTemplate
      : null;

  return (
    <TemplateEditPage
      template={activeTemplate}
      loadError={loadError}
      onBack={() => navigate(appRoute.templates)}
      onSaveTemplate={(id, updates) =>
        saveImportedTemplateChanges(id, updates)
      }
      onDeleteTemplate={(id) => removeImportedTemplate(id)}
    />
  );
}
