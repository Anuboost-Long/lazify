import { getTechIconName } from "@renderer/shared/lib/icon-map";
import { PageHeader } from "@renderer/shared/ui/PageHeader";
import DevIcon from "@renderer/shared/ui/icons/DevIcon";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { TemplateOption } from "@renderer/shared/types/lazify";

interface TemplatesPageProps {
  templateOptions: TemplateOption[];
  selectedTemplateId: string;
}

export function TemplatesPage({ templateOptions, selectedTemplateId }: TemplatesPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Project Recipes"
        title="Templates"
        description="Review the currently available workflow templates and see which one will be used for new project creation."
        icon="package"
      />

      <section className="grid gap-4 lg:grid-cols-2">
        {templateOptions.map((template) => {
          const active = template.id === selectedTemplateId;
          const iconKey = template.label.toLowerCase().includes("expo") ? "expo" : "react";

          return (
            <article
              key={template.id}
              className={`rounded-shell border p-5 shadow-[0_0_8px_rgba(0,0,0,0.4)] ${
                active
                  ? "border-border bg-accentSoft"
                  : "border-border bg-soft"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-bg text-accent">
                    <DevIcon
                      name={getTechIconName(iconKey)}
                      className="text-2xl"
                      title={template.label}
                    />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-text">{template.label}</p>
                    <p className="text-sm text-muted">{template.description}</p>
                  </div>
                </div>
                {active ? (
                  <div className="flex items-center gap-2 rounded-full border border-border bg-accentSoft px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                    <UiIcon name="check-circle" className="h-4 w-4 text-accent" />
                    Active
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
