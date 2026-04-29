import { TemplatesPage } from "@renderer/features/templates/pages/TemplatesPage";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";

export function TemplatesRoute() {
  const { selectedTemplateId, templateOptions } = useLazifyStore();

  return (
    <TemplatesPage
      templateOptions={templateOptions}
      selectedTemplateId={selectedTemplateId}
    />
  );
}
