import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { BodyText, CaptionText, OverlineText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

/**
 * Blank-state artwork for the terminal panel.
 *
 * Follows the project's playful-doc-console direction: sparse rotated squares,
 * capsules and grid marks — no gradients, no blobs. Colours come from theme
 * tokens, so the panel follows the display mode.
 */

function BackdropArt() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Rotated rounded squares */}
      <div className="absolute -left-10 top-12 h-40 w-40 rotate-12 rounded-[28px] border border-text/[0.10]" />
      <div className="absolute right-10 top-16 h-28 w-28 -rotate-6 rounded-[22px] border border-border bg-text/[0.02]" />
      <div className="absolute bottom-10 left-1/4 h-24 w-24 rotate-[18deg] rounded-[20px] border border-text/[0.08]" />

      {/* Circles */}
      <div className="absolute -right-8 bottom-16 h-44 w-44 rounded-full border border-border" />
      <div className="absolute left-16 bottom-24 h-3 w-3 rounded-full bg-text/10" />

      {/* Slim capsules */}
      <div className="absolute right-1/4 top-10 h-2.5 w-20 rotate-12 rounded-full bg-text/[0.08]" />
      <div className="absolute left-1/3 bottom-14 h-2.5 w-14 -rotate-6 rounded-full bg-text/[0.07]" />

      {/* Small grid marks */}
      <div className="absolute right-24 bottom-1/3 grid grid-cols-3 gap-1.5">
        {Array.from({ length: 9 }).map((_, index) => (
          <span key={index} className="h-1 w-1 rounded-full bg-text/[0.10]" />
        ))}
      </div>
      <div className="absolute left-24 top-1/3 grid grid-cols-2 gap-1.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <span key={index} className="h-1 w-1 rounded-full bg-text/[0.14]" />
        ))}
      </div>
    </div>
  );
}

export function AgentEmptyState() {
  const { t } = useTranslation();

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <BackdropArt />

      <div
        className={clsx(
          "relative flex max-w-sm flex-col items-center gap-3 px-6 text-center",
          "animate-fadeIn"
        )}
      >
        <div
          className={clsx(
            "flex h-14 w-14 items-center justify-center rounded-[20px]",
            "border border-border bg-text/[0.06] text-accent"
          )}
        >
          <UiIcon name="terminal" className="h-6 w-6" />
        </div>

        <OverlineText className="!text-muted">{t(translation.Agents.Eyebrow)}</OverlineText>

        <BodyText className="!text-text">{t(translation.Agents.NoSession)}</BodyText>

        <CaptionText className="!text-muted">
          {t(translation.Agents.NoSessionHint)}
        </CaptionText>
      </div>
    </div>
  );
}
