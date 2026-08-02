import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BUILD_STEPS, buildStepIndex } from "../utils/build-steps";

interface BuildProgressProps {
  step: string;
}

/**
 * Three real steps, each named while it runs, with the set drawn as a track.
 *
 * No percentage: `hdiutil` reports none, and one that jumps from 40% to done is
 * worse than not claiming to know.
 */
export function BuildProgress({ step }: BuildProgressProps) {
  const { t } = useTranslation();
  const stepIndex = buildStepIndex(step);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <UiIcon name="refresh-circle" className="h-3.5 w-3.5 animate-spin text-accent" />
        <SmallText className="!text-text">{t(BUILD_STEPS[stepIndex].label)}</SmallText>
      </div>

      <div className="flex gap-1.5" aria-hidden>
        {BUILD_STEPS.map((segment, index) => (
          <span
            key={segment.step}
            className={clsx(
              "h-1 flex-1 rounded-full",
              index < stepIndex && "bg-accent",
              index === stepIndex && "bg-accent animate-pulseLine",
              index > stepIndex && "bg-border"
            )}
          />
        ))}
      </div>
    </div>
  );
}
