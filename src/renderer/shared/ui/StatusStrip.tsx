import clsx from "clsx";
import type { EnvironmentSummary, WorkflowStatus } from "@renderer/shared/types/lazify";
import { translation } from "@renderer/i18n/translation";
import { BodyText, OverlineText, PillText } from "@renderer/shared/typography";
import UiIcon from "./icons/UiIcon";
import { useTranslation } from "react-i18next";

interface StatusStripProps {
  environment: EnvironmentSummary | null;
  label?: string;
  workflowStatus: WorkflowStatus;
  statusMessage: string;
}

export function StatusStrip({ environment, label, workflowStatus, statusMessage }: StatusStripProps) {
  const { t } = useTranslation();

  const statusIcon =
    workflowStatus === "error"
      ? "warning-triangle"
      : workflowStatus === "success"
        ? "check-circle"
        : "activity";
  const tone =
    workflowStatus === "error"
      ? "border-error bg-soft text-error"
      : workflowStatus === "success"
        ? "border-success bg-soft text-success"
        : "border-border bg-soft text-muted";

  return (
    <div
      className={clsx(
        "rounded-[24px] border px-4 py-3 shadow-panel",
        tone
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full border border-current/20 p-2">
            <UiIcon name={statusIcon} className="h-5 w-5" />
          </div>
          <div>
            <OverlineText className="text-current">
              {label ?? t(translation.StatusStrip.RuntimeHealth)}
            </OverlineText>
            <BodyText className="mt-1 text-current">{statusMessage}</BodyText>
          </div>
        </div>
        {environment ? (
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
            <PillText as="span" className="rounded-full border border-current/20 px-3 py-1 text-current">
              Node {environment.nodeVersion}
            </PillText>
            <PillText as="span" className="rounded-full border border-current/20 px-3 py-1 text-current">
              npm {environment.npmVersion}
            </PillText>
            <PillText as="span" className="rounded-full border border-current/20 px-3 py-1 text-current">
              yarn {environment.yarnVersion}
            </PillText>
          </div>
        ) : null}
      </div>
    </div>
  );
}
