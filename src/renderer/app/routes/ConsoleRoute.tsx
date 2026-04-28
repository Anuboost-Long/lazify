import { ConsolePage } from "@renderer/features/console/pages/ConsolePage";
import { useAppShellContext } from "../app-shell-context";

export function ConsoleRoute() {
  const { environment, logs, statusMessage, workflowStatus } =
    useAppShellContext();

  return (
    <ConsolePage
      environment={environment}
      logs={logs}
      statusMessage={statusMessage}
      workflowStatus={workflowStatus}
    />
  );
}
