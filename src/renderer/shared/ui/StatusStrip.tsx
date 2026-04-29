import clsx from "clsx";
import type { EnvironmentSummary, WorkflowStatus } from "@renderer/shared/types/lazify";
import UiIcon from "./icons/UiIcon";

interface StatusStripProps {
  environment: EnvironmentSummary | null;
  workflowStatus: WorkflowStatus;
  statusMessage: string;
}

export function StatusStrip({ environment, workflowStatus, statusMessage }: StatusStripProps) {
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
            <p className="text-xs font-semibold uppercase tracking-[0.24em]">Runtime health</p>
            <p className="mt-1 text-sm">{statusMessage}</p>
          </div>
        </div>
        {environment ? (
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
            <span className="rounded-full border border-current/20 px-3 py-1">Node {environment.nodeVersion}</span>
            <span className="rounded-full border border-current/20 px-3 py-1">npm {environment.npmVersion}</span>
            <span className="rounded-full border border-current/20 px-3 py-1">yarn {environment.yarnVersion}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
