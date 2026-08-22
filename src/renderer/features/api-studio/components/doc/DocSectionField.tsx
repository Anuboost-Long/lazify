import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { DocSectionSpec } from "@main/api-studio/docs/types";
import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { RichTextField } from "./RichTextField";

interface DocSectionFieldProps {
  spec: DocSectionSpec;
  value: string;
  question: string | null;
  /** An agent's answer just landed here, so the field says so for a moment. */
  answered?: boolean;
  onAsk?: () => void;
  onChange: (markdown: string) => void;
}

export function DocSectionField({
  spec,
  value,
  question,
  answered = false,
  onAsk,
  onChange
}: Readonly<DocSectionFieldProps>) {
  const { t } = useTranslation();

  return (
    <section
      className={clsx(
        "flex flex-col gap-2 border-t border-border py-4 first:border-t-0 first:pt-0",
        answered && "-mx-2 rounded-lg bg-accent/[0.06] px-2"
      )}
    >
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold text-text">{spec.title}</h3>
        {spec.required ? null : (
          <span className="text-[10px] uppercase tracking-wide text-muted">
            {t(translation.ApiStudio.DocOptional)}
          </span>
        )}
        {answered ? (
          <span className="flex items-center gap-1 text-[10px] font-medium text-accent">
            <UiIcon name="sparks" className="h-3 w-3" />
            {t(translation.ApiStudio.DocAnswerLanded)}
          </span>
        ) : null}

        <span className="flex-1" />

        {onAsk ? (
          <button
            type="button"
            onClick={onAsk}
            className={clsx(
              "flex shrink-0 items-center gap-1 rounded-md border border-border bg-bg px-2 py-1",
              "text-[10px] font-medium text-muted transition-colors",
              "hover:border-accent/40 hover:text-text"
            )}
          >
            <UiIcon name="sparks" className="h-3 w-3" />
            {t(translation.ApiStudio.DocAskAgent)}
          </button>
        ) : null}
      </div>

      <p className="text-[11px] leading-5 text-muted">{spec.hint}</p>

      {question ? (
        <div
          className={clsx(
            "flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/[0.07] px-2.5 py-2",
            "text-[11px] leading-5 text-text"
          )}
        >
          <UiIcon name="chat-question" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <p className="min-w-0 flex-1">
            <span className="font-semibold">{t(translation.ApiStudio.DocQuestion)}: </span>
            {question}
          </p>

        </div>
      ) : null}

      <RichTextField value={value} placeholder={spec.hint} onChange={onChange} />
    </section>
  );
}
