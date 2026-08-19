import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { SavedExample } from "../types";

interface ResponseExamplesProps {
  examples: SavedExample[];
  viewingId: string | null;
  onView: (id: string | null) => void;
  onRemove: (id: string) => void;
}

export function ResponseExamples({
  examples,
  viewingId,
  onView,
  onRemove
}: Readonly<ResponseExamplesProps>) {
  const { t } = useTranslation();

  if (examples.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2">
      <button
        type="button"
        onClick={() => onView(null)}
        className={clsx(
          "h-6 rounded-md px-2 text-[11px] font-medium transition-colors",
          viewingId === null ? "bg-text/[0.06] text-text" : "text-muted hover:text-text"
        )}
      >
        {t(translation.ApiStudio.LiveResponse)}
      </button>

      {examples.map((example) => (
        <span
          key={example.id}
          className={clsx(
            "flex h-6 items-center gap-1 rounded-md pl-2 pr-1 text-[11px] transition-colors",
            viewingId === example.id ? "bg-accent/10 text-accent" : "text-muted hover:text-text"
          )}
        >
          <button type="button" onClick={() => onView(example.id)} className="font-medium">
            {example.name}
          </button>
          <button
            type="button"
            onClick={() => onRemove(example.id)}
            aria-label={`${t(translation.ApiStudio.RemoveExample)} ${example.name}`}
            className="opacity-60 transition-opacity hover:opacity-100"
          >
            <UiIcon name="xmark" className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
    </div>
  );
}
