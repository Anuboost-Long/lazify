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
}: Readonly<StackPickerCardProps>) {
  const presentation = getTemplatePresentation(template);

  return (
    <button
      type="button"
      onClick={() => onSelect(template.id)}
      className={clsx(
        "group relative overflow-hidden rounded-[26px] border p-5 text-left",
        "animate-fadeIn opacity-0 transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1",
        active
          ? "border-accent bg-accent-gradient-180 text-text shadow-panel"
          : "border-border bg-soft text-text hover:border-accent/70 hover:shadow-panel"
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {active ? <SelectionRail /> : null}

      <CardShapes variant={(animationDelay / 90) % 3 as 0 | 1 | 2} />

      <div className="relative">
        <div className="flex items-start gap-4">
          <div
            className={clsx(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]",
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
            <div className="flex flex-wrap items-center gap-2">
              <PillText
                as="span"
                className={clsx(
                  "rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.2em]",
                  presentation.chipClassName
                )}
              >
                {presentation.badge}
              </PillText>
              {active ? (
                <PillText
                  tone="accent"
                  className="rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 tracking-[0.2em]"
                >
                  Selected
                </PillText>
              ) : null}
            </div>
            <CardTitle className="mt-3 truncate text-lg text-inherit transition-colors group-hover:text-accent">
              {template.label}
            </CardTitle>
            <CaptionText className="mt-1 font-semibold uppercase tracking-[0.2em]">
              {template.id.replace(/-/g, " ")}
            </CaptionText>
            <BodyText tone="muted" className="mt-2 line-clamp-2 min-h-10 text-sm leading-5">
              {template.description}
            </BodyText>
          </div>
        </div>

        <div className="mt-5 border-t border-border/80 pt-4">
          <div className="flex items-center gap-2">
            <CaptionText as="span" className="rounded-lg bg-bg px-2.5 py-1.5 font-medium">
              Scaffold preset
            </CaptionText>
            <CaptionText as="span" className="rounded-lg bg-bg px-2.5 py-1.5 font-medium">
              Editable tree
            </CaptionText>
            <UiIcon
              name="arrow-right"
              className={clsx(
                "ml-auto h-4 w-4 shrink-0 transition-transform duration-200",
                active
                  ? "text-accent"
                  : "text-muted group-hover:translate-x-1 group-hover:text-accent"
              )}
            />
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <OverlineText as="span" tone="muted" className="shrink-0 text-[10px] tracking-[0.18em]">
              Best for
            </OverlineText>
            <BodyText as="span" className="line-clamp-2 text-xs leading-5 text-text/80">
              {presentation.bestFor}
            </BodyText>
          </div>
        </div>
      </div>
    </button>
  );
}
