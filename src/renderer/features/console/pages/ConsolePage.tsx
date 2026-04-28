import { LogPanel } from "@renderer/shared/ui/LogPanel";
import { PageHeader } from "@renderer/shared/ui/PageHeader";
import { StatusStrip } from "@renderer/shared/ui/StatusStrip";
import type {
  EnvironmentSummary,
  LogEntry,
  WorkflowStatus,
} from "@renderer/shared/types/lazify";

interface ConsolePageProps {
  environment: EnvironmentSummary | null;
  logs: LogEntry[];
  statusMessage: string;
  workflowStatus: WorkflowStatus;
}

export function ConsolePage({
  environment,
  logs,
  statusMessage,
  workflowStatus
}: ConsolePageProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Command Stream"
        title="Console"
        description="Inspect every background command Lazify runs, including workflow events, stdout, and errors."
        icon="terminal"
      />

      <StatusStrip
        environment={environment}
        workflowStatus={workflowStatus}
        statusMessage={statusMessage}
      />

      <LogPanel logs={logs} />
    </div>
  );
}
