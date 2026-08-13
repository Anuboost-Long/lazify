import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { getAgentsRoute } from "@renderer/app/app-routes";
import { translation } from "@renderer/i18n/translation";
import { SendToAgentDialog } from "@renderer/features/agents/components/send-to-agent";
import {
  useAgentTerminals,
  useRevealAgentRun,
} from "@renderer/features/agents/hooks/agent-terminals";
import type {
  CodeSelectionAction,
  CodeSelectionContext,
} from "@renderer/shared/ui/code/menu/code-selection";
import { CodeSelectionActionsProvider } from "@renderer/shared/ui/code/menu/selection-actions";

interface ProjectCodeActionsProps {
  projectPath: string;
  children: ReactNode;
}

export function ProjectCodeActions({
  projectPath,
  children,
}: Readonly<ProjectCodeActionsProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selection, setSelection] = useState<CodeSelectionContext | null>(null);
  const { availableAgents, openTerminal, createAgent, deleteAgent } =
    useAgentTerminals(projectPath);
  const revealAgentRun = useRevealAgentRun();

  const actions = useMemo<CodeSelectionAction[]>(
    () => [
      {
        id: "send-to-agent",
        label: t(translation.Agents.SendSelectionToAgent),
        icon: "chat-question",
        onSelect: setSelection,
      },
    ],
    [t],
  );

  return (
    <CodeSelectionActionsProvider actions={actions}>
      {children}

      <SendToAgentDialog
        selection={selection}
        projectPath={projectPath}
        agents={availableAgents}
        onStartAgent={openTerminal}
        onCreateAgent={createAgent}
        onDeleteAgent={deleteAgent}
        onSent={(runId) => {
          revealAgentRun(runId);
          navigate(getAgentsRoute(projectPath));
        }}
        onClose={() => setSelection(null)}
      />
    </CodeSelectionActionsProvider>
  );
}
