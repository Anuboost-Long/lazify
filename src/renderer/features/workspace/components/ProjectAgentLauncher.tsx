import { getAgentsRoute } from "@renderer/app/app-routes";
import { AgentPickerModal } from "@renderer/features/agents/components/agent-picker";
import { useAgentTerminals } from "@renderer/features/agents/hooks/agent-terminals";
import { useNavigate } from "react-router-dom";

interface ProjectAgentLauncherProps {
  open: boolean;
  projectPath: string;
  onClose: () => void;
}

/**
 * The workbench's door to the agents page.
 *
 * Picking an agent here starts its session against this project — the terminal
 * store is shared, so the session is already open by the time we land on the
 * agents page, which the route's `?project=` param points at this project.
 */
export function ProjectAgentLauncher({
  open,
  projectPath,
  onClose,
}: Readonly<ProjectAgentLauncherProps>) {
  const navigate = useNavigate();
  const { availableAgents, openTerminal, createAgent, deleteAgent } =
    useAgentTerminals(projectPath);

  const handleSelect = (agentId: string, resumeSessionId?: string) => {
    void openTerminal(agentId, resumeSessionId);
    navigate(getAgentsRoute(projectPath));
  };

  return (
    <AgentPickerModal
      open={open}
      agents={availableAgents}
      projectPath={projectPath}
      onSelect={handleSelect}
      onClose={onClose}
      onCreate={createAgent}
      onDelete={deleteAgent}
    />
  );
}
