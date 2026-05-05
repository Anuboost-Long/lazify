import type { MouseEvent } from "react";
import clsx from "clsx";
import DevIcon from "@renderer/shared/ui/icons/DevIcon";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { ImportedTemplateOption } from "@renderer/shared/types/lazify";
import { getImportedTemplatePresentation } from "@renderer/shared/lib/imported-template-presentations";

interface ImportedTemplateCardProps {
  template: ImportedTemplateOption;
  active: boolean;
  /** Shows a spinner and disables the delete button while true */
  isDeleting?: boolean;
  /** Disables the delete button (e.g. while another operation is running) */
  disabled?: boolean;
  onSelect: (templateId: string) => void;
  /** When omitted the delete button is not rendered */
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
  const presentation = getImportedTemplatePresentation(template.stack);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(template.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect(template.id);
      }}
      className={clsx(
        "group relative cursor-pointer overflow-hidden rounded-[28px] border p-5 text-left",
        "transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1.5",
        active
          ? "border-accent bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(16,185,129,0.04))] shadow-glow"
          : "border-border bg-soft hover:border-accent"
      )}
    >
      {/* Top accent line */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: "linear-gradient(to right, transparent, var(--color-accent), transparent)"
        }}
      />

      {/* Badge row */}
      <div className="absolute inset-x-5 top-5 flex items-center justify-between gap-3">
        <span
          className={clsx(
            "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]",
            presentation.chipClassName
          )}
        >
          {presentation.badge}
        </span>

        {onDelete ? (
          <button
            type="button"
            disabled={isDeleting || disabled}
            onClick={(e) => onDelete(e, template.id, template.name)}
            title="Delete template"
            className={clsx(
              "flex h-7 w-7 items-center justify-center rounded-full border",
              "transition-colors duration-150",
              isDeleting
                ? "border-error/30 bg-error/5 opacity-60"
                : "border-error/40 bg-error/8 text-error hover:border-error hover:bg-error/15"
            )}
          >
            {isDeleting ? (
              <UiIcon name="refresh-circle" className="h-3 w-3 animate-spin text-error" />
            ) : (
              <UiIcon name="xmark" className="h-3 w-3" />
            )}
          </button>
        ) : null}
      </div>

      {/* Icon + content */}
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
            title={template.name}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-text">{template.name}</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                {template.stack.replace(/-/g, " ")}
              </p>
            </div>
            {active ? (
              <span className="shrink-0 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">
                Selected
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">{template.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-border bg-bg px-3 py-1 text-[11px] font-medium text-muted">
              {template.fileCount} files
            </span>
            <span className="rounded-full border border-border bg-bg px-3 py-1 text-[11px] font-medium text-muted">
              {new Date(template.savedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Source path strip */}
      <div className="mt-5 rounded-[20px] border border-border/80 bg-bg/70 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Source</p>
        <p className="mt-1 truncate font-mono text-xs text-text/80">{template.sourceProjectPath}</p>
      </div>
    </div>
  );
}
