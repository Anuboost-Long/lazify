import { PageCrumb } from "@renderer/app/components/PageChrome";
import { translation } from "@renderer/i18n/translation";
import type {
  ImportedTemplateOption,
  TemplateOption,
} from "@renderer/shared/types/lazify";
import { BodyText } from "@renderer/shared/typography";
import { useTranslation } from "react-i18next";
import { SourceSelectionSection } from "../components/SourceSelectionSection";

interface InitProjectSelectionPageProps {
  importedTemplateOptions: ImportedTemplateOption[];
  sourceMode: "stack" | "imported";
  selectedImportedTemplateId: string;
  selectedTemplateId: string;
  templateOptions: TemplateOption[];
  onSelectSourceMode: (value: "stack" | "imported") => void;
  onSelectTemplate: (templateId: string) => void;
  onSelectImportedTemplate: (templateId: string) => void;
}

export function InitProjectSelectionPage({
  importedTemplateOptions,
  sourceMode,
  selectedImportedTemplateId,
  selectedTemplateId,
  templateOptions,
  onSelectSourceMode,
  onSelectTemplate,
  onSelectImportedTemplate,
}: Readonly<InitProjectSelectionPageProps>) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      <PageCrumb>
        <span className="text-xs text-muted/50">/</span>
        <span className="text-xs font-medium text-text">
          {t(translation.InitProject.ChooseSource)}
        </span>
      </PageCrumb>

      <BodyText className="text-muted">
        {sourceMode === "imported"
          ? t(translation.InitProject.DescriptionImported)
          : t(translation.InitProject.DescriptionStack)}
      </BodyText>

      <SourceSelectionSection
        showSourceModes
        sourceMode={sourceMode}
        onSelectSourceMode={onSelectSourceMode}
        templateOptions={templateOptions}
        selectedTemplateId={selectedTemplateId}
        onSelectTemplate={onSelectTemplate}
        importedTemplateOptions={importedTemplateOptions}
        selectedImportedTemplateId={selectedImportedTemplateId}
        onSelectImportedTemplate={onSelectImportedTemplate}
      />
    </div>
  );
}
