import { translation } from "@renderer/i18n/translation";
import type {
  ImportedTemplateOption,
  TemplateOption,
} from "@renderer/shared/types/lazify";
import { useTranslation } from "react-i18next";
import { ImportedTemplatePicker } from "./ImportedTemplatePicker";
import { SourceModeCard } from "./SourceModeCard";
import { StackPicker } from "./StackPicker";

interface SourceSelectionSectionProps {
  /** Whether the source-mode toggle cards should be shown. */
  showSourceModes: boolean;
  sourceMode: "stack" | "imported";
  onSelectSourceMode: (value: "stack" | "imported") => void;
  // Stack picking
  templateOptions: TemplateOption[];
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
  // Imported template picking
  importedTemplateOptions: ImportedTemplateOption[];
  selectedImportedTemplateId: string;
  onSelectImportedTemplate: (templateId: string) => void;
}

/**
 * Phase 1 of init: choose the project source (fresh stack vs. imported
 * template), then pick a concrete option from the matching picker.
 */
export function SourceSelectionSection({
  showSourceModes,
  sourceMode,
  onSelectSourceMode,
  templateOptions,
  selectedTemplateId,
  onSelectTemplate,
  importedTemplateOptions,
  selectedImportedTemplateId,
  onSelectImportedTemplate,
}: Readonly<SourceSelectionSectionProps>) {
  const { t } = useTranslation();

  return (
    <>
      {/* Source toggle: two cards to switch between the two modes. */}
      {showSourceModes ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <SourceModeCard
            active={sourceMode === "stack"}
            icon="play"
            eyebrow={t(translation.InitProject.FreshScaffold)}
            title={t(translation.InitProject.StartFromStack)}
            description={t(translation.InitProject.StartFromStackDesc)}
            metadata={t(translation.InitProject.ChooseRuntimeFirst)}
            onClick={() => onSelectSourceMode("stack")}
          />
          <SourceModeCard
            active={sourceMode === "imported"}
            icon="import"
            eyebrow={t(translation.InitProject.SavedSnapshot)}
            title={t(translation.InitProject.UseImportedTemplate)}
            description={t(translation.InitProject.UseImportedTemplateDesc)}
            metadata={t(translation.InitProject.StartFromTemplate)}
            onClick={() => onSelectSourceMode("imported")}
          />
        </section>
      ) : null}

      {/* Picker for the active source: stack list OR imported templates. */}
      {sourceMode === "stack" ? (
        <StackPicker
          selectedTemplateId={selectedTemplateId}
          templateOptions={templateOptions}
          onSelect={onSelectTemplate}
        />
      ) : (
        <ImportedTemplatePicker
          templates={importedTemplateOptions}
          selectedTemplateId={selectedImportedTemplateId}
          onSelect={onSelectImportedTemplate}
        />
      )}
    </>
  );
}
