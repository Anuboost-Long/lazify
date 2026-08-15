import clsx from "clsx";
import { useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { CaptionText, OverlineText } from "@renderer/shared/typography";
import { fieldChromeClassName } from "@renderer/shared/ui/form/FormInput";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface PromptPreviewPaneProps {
  prompt: string;
  /** True once the user has changed the generated text by hand. */
  isEdited: boolean;
  contextCount: number;
  onEdit: (text: string) => void;
  onRegenerate: () => void;
}

/**
 * The exact text the agent will receive — shown in full rather than summarized,
 * because the point of building it here is being able to read it before it goes.
 */
export function PromptPreviewPane({
  prompt,
  isEdited,
  contextCount,
  onEdit,
  onRegenerate
}: Readonly<PromptPreviewPaneProps>) {
  const { t } = useTranslation();
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const scrollTop = useRef(0);

  /**
   * Puts the reader back where they were after a rebuild.
   *
   * The prompt is rebuilt on every pause in typing, and giving a textarea a new
   * value drops its scroll position — so reading the end of a long prompt while
   * still editing the fields threw the view back to the top every time. Runs
   * before paint, so the jump is never on screen. Skipped while the caret is in
   * here: that scrolling is the typist's own.
   */
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box || document.activeElement === box) return;

    box.scrollTop = scrollTop.current;
  }, [prompt]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <OverlineText tone="muted">{t(translation.PromptBuilder.AgentPrompt)}</OverlineText>

        {isEdited ? (
          <button
            type="button"
            onClick={onRegenerate}
            className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-muted hover:border-accent/40 hover:text-accent"
          >
            <UiIcon name="refresh-circle" className="h-3 w-3" />
            <CaptionText>{t(translation.PromptBuilder.Regenerate)}</CaptionText>
          </button>
        ) : null}
      </div>

      <textarea
        ref={boxRef}
        value={prompt}
        onChange={(event) => onEdit(event.target.value)}
        onScroll={(event) => {
          scrollTop.current = event.currentTarget.scrollTop;
        }}
        spellCheck={false}
        placeholder={t(translation.PromptBuilder.PreviewEmpty)}
        className={clsx(
          fieldChromeClassName(),
          "min-h-0 flex-1 resize-none font-mono text-[12px] leading-6",
          isEdited && "!border-accent/40"
        )}
      />

      <div className="flex items-center justify-between gap-2">
        <CaptionText tone="muted">
          {t(translation.PromptBuilder.ContextIncluded, { count: contextCount })}
        </CaptionText>

        {isEdited ? (
          <CaptionText tone="muted" className="flex items-center gap-1">
            <UiIcon name="edit" className="h-3 w-3" />
            {t(translation.PromptBuilder.EditedForThisRun)}
          </CaptionText>
        ) : null}
      </div>
    </div>
  );
}
