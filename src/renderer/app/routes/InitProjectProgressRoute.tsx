import { ProjectCreationProgressPage } from "@renderer/features/init/pages/ProjectCreationProgressPage";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";

export function InitProjectProgressRoute() {
  const {
    chooseCommandOption,
    commandChoicePrompt,
    environment,
    logs,
    projectName,
    starterFailureReason,
    statusMessage,
    workflowStatus,
  } = useLazifyStore();

  return (
    <ProjectCreationProgressPage
      commandChoicePrompt={commandChoicePrompt}
      environment={environment}
      logs={logs}
      projectName={projectName}
      starterFailureReason={starterFailureReason}
      statusMessage={statusMessage}
      workflowStatus={workflowStatus}
      onChooseCommandOption={(promptId, optionId) => {
        void chooseCommandOption(promptId, optionId);
      }}
    />
  );
}
