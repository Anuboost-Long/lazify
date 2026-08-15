import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { renderContext } from "@main/prompts/context-types";
import type { ContextEntry } from "@main/prompts/types";
import { translation } from "@renderer/i18n/translation";
import { CaptionText, SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface ContextEntryRowProps {
  entry: ContextEntry;
  /** Shipped entries can be switched off but never deleted. */
  deletable: boolean;
  presetNames: Record<string, string>;
  onToggle: (isActive: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ContextEntryRow({
  entry,
  deletable,
  presetNames,
  onToggle,
  onEdit,
  onDelete
}: Readonly<ContextEntryRowProps>) {
  const { t } = useTranslation();

  return (
    <div
      className={clsx(
        "group flex items-start gap-2 rounded-lg px-2 py-1.5",
        "hover:bg-text/[0.03]",
        !entry.isActive && "opacity-45"
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={entry.isActive}
        onClick={() => onToggle(!entry.isActive)}
        aria-label={renderContext(entry.type, entry.payload)}
        className={clsx(
          "mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
          entry.isActive ? "border-accent bg-accent text-bg" : "border-border"
        )}
      >
        {entry.isActive ? <UiIcon name="check-circle" className="h-2.5 w-2.5" /> : null}
      </button>

      <div className="min-w-0 flex-1">
        <SmallText className="!text-text block leading-5">
          {renderContext(entry.type, entry.payload)}
        </SmallText>

        {entry.appliesTo.length > 0 ? (
          <CaptionText tone="muted" className="mt-0.5 block truncate">
            {t(translation.PromptBuilder.OnlyFor, {
              presets: entry.appliesTo.map((id) => presetNames[id] ?? id).join(", ")
            })}
          </CaptionText>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
        <button
          type="button"
          onClick={onEdit}
          aria-label={t(translation.GlobalTerm.Rename)}
          className="rounded p-1 text-muted hover:text-text"
        >
          <UiIcon name="edit" className="h-3 w-3" />
        </button>

        {deletable ? (
          <button
            type="button"
            onClick={onDelete}
            aria-label={t(translation.GlobalTerm.Delete)}
            className="rounded p-1 text-muted hover:text-error"
          >
            <UiIcon name="trash" className="h-3 w-3" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
