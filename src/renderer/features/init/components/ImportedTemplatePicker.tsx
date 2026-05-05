import type { ImportedTemplateOption } from "@renderer/shared/types/lazify";
import { ImportedTemplateCard } from "@renderer/shared/ui/ImportedTemplateCard";

interface ImportedTemplatePickerProps {
  templates: ImportedTemplateOption[];
  selectedTemplateId: string;
  onSelect: (templateId: string) => void;
}

export function ImportedTemplatePicker({
  templates,
  selectedTemplateId,
  onSelect
}: ImportedTemplatePickerProps) {
  if (templates.length === 0) {
    return (
      <section className="rounded-[24px] border border-border bg-soft p-6 shadow-panel">
        <p className="text-sm leading-6 text-muted">
          No imported templates have been saved yet. Use Import Project first, then save one as JSON.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {templates.map((template) => (
        <ImportedTemplateCard
          key={template.id}
          template={template}
          active={template.id === selectedTemplateId}
          onSelect={onSelect}
        />
      ))}
    </section>
  );
}
