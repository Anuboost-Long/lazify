import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { appRoute } from "@renderer/app/app-routes";
import { translation } from "@renderer/i18n/translation";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";
import { Toast } from "@renderer/shared/ui/toast/Toast";
import { useFocusAgentRun } from "../hooks/agent-terminals";

interface AgentDoneEvent {
  runId: string;
  projectPath: string;
  projectName: string;
  agentLabel: string;
}

export function AgentDoneToast() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setActiveProjectPath } = useLazifyStore();
  const focusAgentRun = useFocusAgentRun();

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
