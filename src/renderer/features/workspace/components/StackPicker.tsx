import clsx from "clsx";
import { getTechIconName } from "@renderer/shared/lib/icon-map";
import DevIcon from "@renderer/shared/ui/icons/DevIcon";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { TemplateOption } from "@renderer/shared/types/lazify";

interface StackPickerProps {
  selectedTemplateId: string;
  templateOptions: TemplateOption[];
  onSelect: (templateId: string) => void;
}

function getTemplateIconKey(label: string) {
  const normalized = label.toLowerCase();

  if (normalized.includes("expo")) {
    return "expo";
  }

  if (normalized.includes("next")) {
    return "next";
  }

  if (normalized.includes("vite")) {
    return "vite";
  }

  return "react";
}

export function StackPicker({
  selectedTemplateId,
  templateOptions,
  onSelect,
}: StackPickerProps) {
  const chooserCardClassName = (active: boolean) =>
    clsx(
      "group relative overflow-hidden rounded-[24px] border p-5 text-left",
      "animate-fadeIn opacity-0 transition duration-300 ease-out hover:-translate-y-1",
      active
        ? "border-accent bg-accentSoft text-text shadow-glow"
        : "border-border bg-soft text-text hover:border-accent"
    );

  return (
    <section className="flex min-h-[28rem] items-center justify-center">
      <div className="w-full max-w-5xl">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templateOptions.map((template, index) => {
            const active = template.id === selectedTemplateId;
            const iconName = getTechIconName(getTemplateIconKey(template.label));

            return (
              <button
                key={template.id}
                type="button"
                onClick={() => onSelect(template.id)}
                className={chooserCardClassName(active)}
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-px"
                  style={{
                    background:
                      "linear-gradient(to right, transparent, var(--color-accent), transparent)",
                  }}
                />

                <div className="flex items-start gap-4">
                  <div
                    className={clsx(
                      "flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border",
                      active
                        ? "border-accent bg-bg text-accent"
                        : "border-border bg-bg text-accent"
                    )}
                  >
                    <DevIcon
                      name={iconName}
                      className="text-3xl"
                      title={template.label}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-base font-semibold text-inherit">
                        {template.label}
                      </p>
                      <UiIcon
                        name="arrow-right"
                        className={clsx(
                          "h-4 w-4 shrink-0 transition-transform duration-200",
                          active
                            ? "translate-x-0 text-accent"
                            : "text-muted group-hover:translate-x-1 group-hover:text-accent"
                        )}
                      />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {template.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
