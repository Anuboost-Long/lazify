import { ConsolePage } from "@renderer/features/console/pages/ConsolePage";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";

export function ConsoleRoute() {
  const { environment, logs, statusMessage, workflowStatus } =
    useLazifyStore();

  return (
    <ConsolePage
      environment={environment}
      logs={logs}
      statusMessage={statusMessage}
      workflowStatus={workflowStatus}
    />
  );
}
