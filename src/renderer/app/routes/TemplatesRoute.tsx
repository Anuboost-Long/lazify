import { TemplatesPage } from "@renderer/features/templates/pages/TemplatesPage";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";

export function TemplatesRoute() {
  const {
    importedTemplateOptions,
    selectedImportedTemplate,
    selectedImportedTemplateId,
    loadImportedTemplate,
    removeImportedTemplate,
    saveImportedTemplateChanges
  } = useLazifyStore();

  return (
    <TemplatesPage
      importedTemplateOptions={importedTemplateOptions}
      selectedImportedTemplate={selectedImportedTemplate}
      selectedImportedTemplateId={selectedImportedTemplateId}
      onSelectTemplate={(templateId) => void loadImportedTemplate(templateId)}
      onDeleteTemplate={(templateId) => void removeImportedTemplate(templateId)}
      onSaveTemplate={(templateId, updates) =>
        saveImportedTemplateChanges(templateId, updates)
      }
    />
  );
}
