import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { BodyText, MonoText, PillText } from "@renderer/shared/typography";
import { LabelButton } from "@renderer/shared/ui/LabelButton";
import { SelectionRail, type RailTone } from "@renderer/shared/ui/card/SelectionRail";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { DmgResult } from "../hooks/use-dmg-compiler";
import { formatSize } from "../utils/format-size";
import { WarningNotice } from "./WarningNotice";

interface BuildOutcomeProps {
  result: DmgResult;
}

/** The shared frame both outcomes sit in — a neutral card with a state rail. */
function OutcomeCard({
  tone,
  align,
  children
}: Readonly<{ tone: RailTone; align: string; children: React.ReactNode }>) {
  return (
    <section
      className={clsx(
        "relative flex gap-4 overflow-hidden",
        align,
        "border border-border rounded-[20px] bg-soft px-4 py-3.5 shadow-panel",
        "animate-fadeIn"
      )}
    >
      {/* Rail rather than a coloured wash: the surface stays neutral and the
          state is readable down the left edge, as on the tool cards. Left at the
          shared inset so these cards line up with the rest of the app. */}
      <SelectionRail tone={tone} />
      {children}
    </section>
  );
}

/** What the build produced: the image and where it went, or why there is none. */
export function BuildOutcome({ result }: BuildOutcomeProps) {
  const { t } = useTranslation();

  if (!result.success) {
    return (
      <OutcomeCard tone="error" align="items-start">
        <span
          className={clsx(
            "flex h-11 w-11 shrink-0 items-center justify-center",
            "border border-error/25 rounded-2xl bg-error/10 text-error"
          )}
        >
          <UiIcon name="warning-triangle" className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <BodyText className="!text-text">{t(translation.DmgCompiler.FailedTitle)}</BodyText>

          {/* The tool's own words: `hdiutil` failures are specific, and
              paraphrasing them would only hide which one happened. */}
          <MonoText
            as="pre"
            className={clsx(
              "mt-2 max-h-40 overflow-auto",
              "border border-border rounded-lg bg-bg px-2.5 py-2",
              "text-[11px] leading-relaxed text-muted whitespace-pre-wrap"
            )}
          >
            {result.message}
          </MonoText>
        </div>
      </OutcomeCard>
    );
  }

  return (
    <>
      {/* Above the success strip and in the warning palette rather than the
          error one: there is a finished image below this, and it does install. */}
      {result.warning ? (
        <WarningNotice
          title={t(translation.DmgCompiler.WarningTitle)}
          message={result.warning}
        />
      ) : null}

      <OutcomeCard tone="success" align="items-center">
        <span
          className={clsx(
            "flex h-11 w-11 shrink-0 items-center justify-center",
            "border border-success/25 rounded-2xl bg-success/10 text-success"
          )}
        >
          <UiIcon name="check-circle" className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <BodyText className="!text-text">{t(translation.DmgCompiler.BuiltTitle)}</BodyText>
            <PillText
              as="span"
              className="border border-border rounded-full bg-bg px-2 py-0.5 !text-muted"
            >
              {formatSize(result.sizeBytes)}
            </PillText>
          </div>

          <MonoText
            as="span"
            title={result.outputPath}
            className="mt-0.5 block truncate text-[11px] text-muted"
          >
            {result.outputPath}
          </MonoText>
        </div>

        <LabelButton
          label={translation.DmgCompiler.RevealDmg}
          icon="folder"
          variant="success"
          onClick={() => void globalThis.lazify.revealInFileManager(result.outputPath)}
        />
      </OutcomeCard>
    </>
  );
}
