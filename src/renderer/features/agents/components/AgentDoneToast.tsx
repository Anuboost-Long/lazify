import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { appRoute } from "@renderer/app/app-routes";
import { translation } from "@renderer/i18n/translation";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";
import { Toast } from "@renderer/shared/ui/toast/Toast";
import { useFocusAgentRun } from "../hooks/use-agent-terminals";

interface AgentDoneEvent {
  runId: string;
  projectPath: string;
  projectName: string;
  agentLabel: string;
}

/**
 * The green "your agent is done" alert.
 *
 * Mounted by the shell rather than by the agents page: a turn most often ends
 * while the user is somewhere else entirely, which is exactly when the alert
 * matters. Clicking it — or the OS banner that fires when the window is not
 * focused — opens the project's agents page on the tab that finished.
 */
export function AgentDoneToast() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setActiveProjectPath } = useLazifyStore();
  const focusAgentRun = useFocusAgentRun();
  /** Latest completion, shown until it is clicked or auto-dismisses. */
  const [done, setDone] = useState<AgentDoneEvent | null>(null);

  const openRun = useCallback(
    (event: { runId: string; projectPath: string }) => {
      setActiveProjectPath(event.projectPath);
      focusAgentRun(event.runId);
      navigate(appRoute.agents);
    },
    [focusAgentRun, navigate, setActiveProjectPath],
  );

  useEffect(() => {
    return globalThis.lazify.onAgentDone((event) => setDone(event));
  }, []);

  // Clicking the OS banner goes to the same place as clicking the toast.
  useEffect(() => {
    return globalThis.lazify.onAgentFocus((event) => {
      openRun(event);
      setDone(null);
    });
  }, [openRun]);

  if (!done) return null;

  return (
    <Toast
      variant="success"
      title={t(translation.Agents.TaskDone)}
      message={t(translation.Agents.TaskDoneToast, {
        agent: done.agentLabel,
        project: done.projectName,
      })}
      onClick={() => {
        openRun(done);
        setDone(null);
      }}
      onClose={() => setDone(null)}
    />
  );
}
