import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { BodyText, CardTitle, OverlineText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

/**
 * The whole page, everywhere that is not macOS.
 *
 * `hdiutil`, `ditto` and `sips` are macOS tools, and a `.app` only means
 * anything there. Rather than fail at the end of a build, the page says so.
 */
export function MacOnlyNotice() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-16 text-center">
      <span
        className={clsx(
          "flex h-14 w-14 items-center justify-center",
          "rounded-2xl border border-border bg-soft text-muted"
        )}
      >
        <UiIcon name="hard-drive" className="h-6 w-6" />
      </span>

      <OverlineText className="!text-muted">{t(translation.DmgCompiler.Eyebrow)}</OverlineText>
      <CardTitle>{t(translation.DmgCompiler.Title)}</CardTitle>
      <BodyText tone="muted" className="leading-relaxed">
        {t(translation.DmgCompiler.MacOnly)}
      </BodyText>
    </div>
  );
}
