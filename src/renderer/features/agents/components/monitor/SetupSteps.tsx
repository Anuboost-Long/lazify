import clsx from "clsx";
import { Fragment } from "react";

import { CaptionText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface SetupStepsProps {
  steps: string[];
  current: number;
}

export function SetupSteps({ steps, current }: Readonly<SetupStepsProps>) {
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((step, index) => (
        <Fragment key={step}>
          {index > 0 ? (
            <UiIcon name="arrow-right" className="h-3 w-3 shrink-0 text-muted/40" />
          ) : null}
          <CaptionText
            as="span"
            className={clsx(
              "!text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors",
              index === current
                ? "!text-accent"
                : index < current
                  ? "!text-text/60"
                  : "!text-muted/40"
            )}
          >
            {step}
          </CaptionText>
        </Fragment>
      ))}
    </div>
  );
}
