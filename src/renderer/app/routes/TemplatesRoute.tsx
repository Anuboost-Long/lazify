import { TemplatesPage } from "@renderer/features/templates/pages/TemplatesPage";
import { useAppShellContext } from "../app-shell-context";

export function TemplatesRoute() {
  const { selectedTemplateId, templateOptions } = useAppShellContext();

  return (
    <TemplatesPage
      templateOptions={templateOptions}
      selectedTemplateId={selectedTemplateId}
    />
  );
}
