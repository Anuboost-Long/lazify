import type { StarterFailureReason } from "@main/starter-provisioner";
import { StarterFailureNotice } from "@renderer/shared/ui/StarterFailureNotice";
import { translation } from "@renderer/i18n/translation";
import { LogPanel } from "@renderer/shared/ui/LogPanel";
import { StatusStrip } from "@renderer/shared/ui/StatusStrip";
import { Toast } from "@renderer/shared/ui/toast/Toast";
import type {
  EnvironmentSummary,
  LogEntry,
  WorkflowStatus,
} from "@renderer/shared/types/lazify";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface ConsolePageProps {
  environment: EnvironmentSummary | null;
  logs: LogEntry[];
  starterFailureReason: StarterFailureReason | null;
  statusMessage: string;
  workflowStatus: WorkflowStatus;
}

export function ConsolePage({
  environment,
  logs,
  starterFailureReason,
  statusMessage,
  workflowStatus
}: ConsolePageProps) {
  const { t } = useTranslation();
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const prevStatusRef = useRef<WorkflowStatus>(workflowStatus);

  useEffect(() => {
    if (prevStatusRef.current === "running" && workflowStatus === "success") {
      setShowSuccessToast(true);
    }
    prevStatusRef.current = workflowStatus;
  }, [workflowStatus]);

  return (
    <div className="flex flex-col gap-6">
      <StatusStrip
        environment={environment}
        workflowStatus={workflowStatus}
        statusMessage={statusMessage}
      />

      {starterFailureReason ? <StarterFailureNotice reason={starterFailureReason} /> : null}

      <LogPanel logs={logs} />

      {showSuccessToast ? (
        <Toast
          variant="success"
          title={t(translation.Console.ProjectInitialized)}
          message={statusMessage}
          onClose={() => setShowSuccessToast(false)}
        />
      ) : null}
    </div>
  );
}
