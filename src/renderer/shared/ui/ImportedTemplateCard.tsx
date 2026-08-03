import type { MouseEvent } from "react";
import clsx from "clsx";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import { SelectionRail } from "@renderer/shared/ui/card/SelectionRail";
import DevIcon from "@renderer/shared/ui/icons/DevIcon";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { ImportedTemplateOption } from "@renderer/shared/types/lazify";
import { getImportedTemplatePresentation } from "@renderer/shared/lib/imported-template-presentations";
import { translation } from "@renderer/i18n/translation";
import { BodyText, CaptionText, CardTitle, MonoText, OverlineText, PillText } from "@renderer/shared/typography";
import { useTranslation } from "react-i18next";

interface ImportedTemplateCardProps {
  template: ImportedTemplateOption;
  active: boolean;
  isDeleting?: boolean;
  disabled?: boolean;
  onSelect: (templateId: string) => void;
  onDelete?: (event: MouseEvent, templateId: string, templateName: string) => void;
}

export function ImportedTemplateCard({
  template,
  active,
  isDeleting = false,
  disabled = false,
  onSelect,
  onDelete
}: ImportedTemplateCardProps) {
  const { t } = useTranslation();
  const presentation = getImportedTemplatePresentation(template.stack);

  return (
    <article
      className={clsx(
        "group relative overflow-hidden rounded-[26px] border text-left",
        "transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1",
        active
          ? "border-accent bg-accent-gradient-180 shadow-panel"
          : "border-border bg-soft hover:border-accent/70 hover:shadow-panel"
      )}
    >
      {active ? <SelectionRail /> : null}

      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(template.id)}
        aria-label={`${t(translation.GlobalTerm.Open)} ${template.name}`}
        className="block w-full p-5 text-left disabled:cursor-not-allowed disabled:opacity-60"
      >
        <div className={clsx("flex items-start gap-4", onDelete && "pr-9")}>
          <div
            className={clsx(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]",
              presentation.frameClassName,
              active && presentation.activeGlow
            )}
          >
            <DevIcon
              name={presentation.iconName}
              className={presentation.iconClassName}
              title={template.name}
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
                <PillText tone="accent" className="rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 tracking-[0.2em]">
                  {t(translation.TemplateCard.Selected)}
                </PillText>
              ) : null}
            </div>
            <CardTitle className="mt-3 truncate text-lg transition-colors group-hover:text-accent">
              {template.name}
            </CardTitle>
            <BodyText tone="muted" className="mt-1 line-clamp-2 min-h-10 text-sm leading-5">
              {template.description}
            </BodyText>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-2 border-t border-border/80 pt-4">
          <CaptionText as="span" className="rounded-lg bg-bg px-2.5 py-1.5 font-medium">
            {t(translation.TemplateCard.FilesCount, { count: template.fileCount })}
          </CaptionText>
          <CaptionText as="span" className="rounded-lg bg-bg px-2.5 py-1.5 font-medium">
            {new Date(template.savedAt).toLocaleDateString()}
          </CaptionText>
          <span className="flex min-w-0 items-center justify-end gap-2 text-muted transition-colors group-hover:text-accent">
            <OverlineText as="span" tone="muted" className="sr-only">
              {t(translation.TemplateCard.Source)}
            </OverlineText>
            <MonoText as="span" className="truncate text-xs text-inherit">
              {template.sourceProjectPath}
            </MonoText>
            <UiIcon name="arrow-right" className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </button>

      {onDelete ? (
        <Tooltip content={t(translation.TemplateCard.Delete)} side="top">
          <button
            type="button"
            disabled={isDeleting || disabled}
            onClick={(event) => onDelete(event, template.id, template.name)}
            aria-label={`${t(translation.TemplateCard.Delete)} ${template.name}`}
            className={clsx(
              "absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-[11px] border",
              "transition-[color,background-color,border-color,opacity] duration-150",
              isDeleting
                ? "border-error/30 bg-error/5 opacity-60"
                : "border-border bg-bg/80 text-muted opacity-70 hover:border-error/50 hover:bg-error/10 hover:text-error group-hover:opacity-100"
            )}
          >
            {isDeleting ? (
              <UiIcon name="refresh-circle" className="h-3.5 w-3.5 animate-spin text-error" />
            ) : (
              <UiIcon name="trash" className="h-3.5 w-3.5" />
            )}
          </button>
        </Tooltip>
      ) : null}
    </article>
  );
}
