import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { PillText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

/** The three things this page does, drawn as the flow it is. */
export function FlowHint() {
  const { t } = useTranslation();

  const steps = [
    { icon: "package", label: translation.DmgCompiler.FlowPick },
    { icon: "settings", label: translation.DmgCompiler.FlowName },
    { icon: "hard-drive", label: translation.DmgCompiler.FlowBuild }
  ] as const;

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {steps.map((step, index) => (
        <div key={step.label} className="flex items-center gap-1.5">
          <span className={clsx("flex items-center gap-1.5", "text-muted")}>
            <UiIcon name={step.icon} className="h-3 w-3" />
            <PillText as="span">{t(step.label)}</PillText>
          </span>

          {index < steps.length - 1 ? (
            <UiIcon name="arrow-right" className="h-3 w-3 shrink-0 text-muted/60" />
          ) : null}
        </div>
      ))}
    </div>
  );
}
