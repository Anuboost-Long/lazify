import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { formatStackLabel } from "@renderer/shared/lib/stack-label";
import {
  BodyText,
  CardTitle,
  OverlineText,
  PillText,
} from "@renderer/shared/typography";
import type { StackDetectionResult } from "@renderer/shared/types/lazify";

interface DetectionSummaryProps {
  stackDetection: StackDetectionResult;
}

function formatConfidence(confidence: number) {
  return `${Math.round(confidence * 100)}%`;
}

export function DetectionSummary({
  stackDetection,
}: Readonly<DetectionSummaryProps>) {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden rounded-[26px] border border-border bg-soft p-6 shadow-panel">
      <div className="absolute inset-y-0 left-0 w-1 bg-accent" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <OverlineText className="tracking-[0.22em]">
            {t(translation.ImportProject.DetectedStack)}
          </OverlineText>
          <CardTitle className="mt-2 text-xl">
            {formatStackLabel(stackDetection.stack)}
          </CardTitle>
        </div>

        <PillText className="rounded-full border border-success/25 bg-success/10 px-4 py-2 text-xs tracking-[0.2em] text-success">
          {t(translation.ImportProject.Confidence, {
            value: formatConfidence(stackDetection.confidence),
          })}
        </PillText>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          [translation.ImportProject.Framework, stackDetection.framework],
          [
            translation.ImportProject.MetaFramework,
            stackDetection.metaFramework,
          ],
          [
            translation.ImportProject.PackageManager,
            stackDetection.packageManager,
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-[18px] border border-border bg-bg/70 px-4 py-3"
          >
            <OverlineText
              tone="muted"
              className="text-[10px] tracking-[0.2em]"
            >
              {t(label)}
            </OverlineText>
            <BodyText className="mt-1 font-semibold">
              {formatStackLabel(value)}
            </BodyText>
          </div>
        ))}
      </div>

      {stackDetection.reasons.length > 0 ? (
        <BodyText tone="muted" className="mt-4 leading-6">
          {stackDetection.reasons.join(". ")}.
        </BodyText>
      ) : null}

      {stackDetection.warnings.length > 0 ? (
        <BodyText className="mt-4 rounded-[16px] border border-amber-300/40 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300">
          {stackDetection.warnings.join(" ")}
        </BodyText>
      ) : null}
    </section>
  );
}
