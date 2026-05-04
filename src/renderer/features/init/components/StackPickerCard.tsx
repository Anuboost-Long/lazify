import type { TemplateOption } from "@renderer/shared/types/lazify";
import DevIcon from "@renderer/shared/ui/icons/DevIcon";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import clsx from "clsx";
import { getTemplatePresentation } from "../lib/stack-presentations";

interface StackPickerCardProps {
  template: TemplateOption;
  active: boolean;
  animationDelay: number;
  onSelect: (templateId: string) => void;
}

export function StackPickerCard({
  template,
  active,
  animationDelay,
  onSelect,
}: StackPickerCardProps) {
  const presentation = getTemplatePresentation(template);

  return (
    <button
      type="button"
      onClick={() => onSelect(template.id)}
      className={clsx(
        "group relative overflow-hidden rounded-[28px] border p-5 text-left",
        "animate-fadeIn opacity-0 transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1.5",
        active
          ? "border-accent bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(16,185,129,0.04))] text-text shadow-glow"
          : "border-border bg-soft text-text hover:border-accent"
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(to right, transparent, var(--color-accent), transparent)",
        }}
      />

      <div className="absolute inset-x-5 top-5 flex items-center justify-between gap-3">
        <span
          className={clsx(
            "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]",
            presentation.chipClassName
          )}
        >
          {presentation.badge}
        </span>
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

      <div className="flex items-start gap-4 pt-12">
        <div
          className={clsx(
            "flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] dark:border dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
            presentation.frameClassName,
            active && presentation.activeGlow
          )}
        >
          <DevIcon
            name={presentation.iconName}
            className={presentation.iconClassName}
            title={template.label}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-inherit">
                {template.label}
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                {template.id.replace(/-/g, " ")}
              </p>
            </div>
            {active ? (
              <span className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">
                Selected
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">
            {template.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-border bg-bg px-3 py-1 text-[11px] font-medium text-muted">
              Scaffold preset
            </span>
            <span className="rounded-full border border-border bg-bg px-3 py-1 text-[11px] font-medium text-muted">
              Editable tree
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[20px] border border-border/80 bg-bg/70 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
          Best for
        </p>
        <p className="mt-2 text-sm leading-6 text-text/90">
          {presentation.bestFor}
        </p>
      </div>
    </button>
  );
}
