import type { TemplateOption } from "@renderer/shared/types/lazify";
import { BodyText, CaptionText, CardTitle, OverlineText, PillText } from "@renderer/shared/typography";
import DevIcon from "@renderer/shared/ui/icons/DevIcon";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import clsx from "clsx";
import { CardShapes } from "@renderer/shared/ui/card/CardShapes";
import { SelectionRail } from "@renderer/shared/ui/card/SelectionRail";
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
          ? "border-accent bg-accent-gradient-180 text-text shadow-panel"
          : "border-border bg-soft text-text hover:border-accent"
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {active ? <SelectionRail /> : null}

      <CardShapes variant={(animationDelay / 60) % 3 as 0 | 1 | 2} />

      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(to right, transparent, var(--color-accent), transparent)",
        }}
      />

      <div className="absolute inset-x-5 top-5 z-10 flex items-center justify-between gap-3">
        <PillText
          as="span"
          className={clsx(
            "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]",
            presentation.chipClassName
          )}
        >
          {presentation.badge}
        </PillText>
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

      <div className="relative flex items-start gap-4 pt-12">
        <div
          className={clsx(
            "flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] dark:border dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
            "transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105",
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
              <CardTitle className="truncate text-inherit">
                {template.label}
              </CardTitle>
              <CaptionText className="mt-1 font-semibold uppercase tracking-[0.22em]">
                {template.id.replace(/-/g, " ")}
              </CaptionText>
            </div>
            {active ? (
              <PillText tone="accent" className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 tracking-[0.22em]">
                Selected
              </PillText>
            ) : null}
          </div>
          <BodyText tone="muted" className="mt-3 leading-6">
            {template.description}
          </BodyText>
          <div className="mt-4 flex flex-wrap gap-2">
            <CaptionText as="span" className="rounded-full border border-border bg-bg px-3 py-1 font-medium">
              Scaffold preset
            </CaptionText>
            <CaptionText as="span" className="rounded-full border border-border bg-bg px-3 py-1 font-medium">
              Editable tree
            </CaptionText>
          </div>
        </div>
      </div>

      <div className="relative mt-5 rounded-[20px] border border-border/80 bg-bg/70 px-4 py-3">
        <OverlineText tone="muted" className="text-[11px] tracking-[0.22em]">
          Best for
        </OverlineText>
        <BodyText className="mt-2 leading-6 text-text/90">
          {presentation.bestFor}
        </BodyText>
      </div>
    </button>
  );
}
