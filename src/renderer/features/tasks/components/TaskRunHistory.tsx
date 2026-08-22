import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { TaskAgentRun } from "@main/tasks/types";
import { translation } from "@renderer/i18n/translation";
import { CaptionText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface TaskRunHistoryProps {
  taskId: string;
}

function when(iso: string): string {
  const at = new Date(iso);
  return `${at.toLocaleDateString()} ${at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

/** What this task has already been sent to an agent, and exactly how it read. */
export function TaskRunHistory({ taskId }: Readonly<TaskRunHistoryProps>) {
  const { t } = useTranslation();
  const [runs, setRuns] = useState<TaskAgentRun[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void globalThis.lazify.listTaskRuns(taskId).then((loaded) => {
      if (!cancelled) setRuns(loaded);
    });

    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const copy = async (run: TaskAgentRun) => {
    await navigator.clipboard.writeText(run.generatedPrompt);
    setCopiedId(run.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (runs.length === 0) {
    return (
      <CaptionText tone="muted" className="block">
        {t(translation.Tasks.NoRuns)}
      </CaptionText>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {runs.map((run) => (
        <div key={run.id} className="flex items-center gap-2">
          <UiIcon name="play" className="h-3 w-3 shrink-0 text-muted" />

          <CaptionText tone="muted" className="min-w-0 flex-1 truncate">
            {run.agentLabel ? `${run.agentLabel} · ` : ""}
            {when(run.startedAt)}
          </CaptionText>

          <button
            type="button"
            onClick={() => void copy(run)}
            aria-label={t(translation.Tasks.CopyRunPrompt)}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-text/10 hover:text-accent"
          >
            <UiIcon name={copiedId === run.id ? "check-circle" : "code"} className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
