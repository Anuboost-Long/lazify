import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { Task } from "@main/tasks/types";
import { translation } from "@renderer/i18n/translation";
import { pasteIntoTerminal } from "@renderer/shared/lib/terminal-paste";
import { CaptionText, SectionTitle, SmallText } from "@renderer/shared/typography";
import type { PtySession } from "@renderer/shared/types/lazify";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";

interface SendTaskModalProps {
  open: boolean;
  task: Task | null;
  /** Called once the prompt is on its way, so the caller can follow it. */
  onSent: (session: PtySession) => void;
  onClose: () => void;
}

/**
 * Hands a task to an agent.
 *
 * The prompt is built here from the stored task — same preset, same context as
 * anywhere else — and pasted into the chosen session. The exact text is kept in
 * the task's history, so what the agent was told is never a guess afterwards.
 */
export function SendTaskModal(props: Readonly<SendTaskModalProps>) {
  return (
    <BaseModal open={props.open} onClose={props.onClose}>
      {props.open && props.task ? <SendCard {...props} task={props.task} /> : null}
    </BaseModal>
  );
}

function SendCard({
  task,
  onSent,
  onClose
}: Readonly<SendTaskModalProps & { task: Task }>) {
  const { t } = useTranslation();
  const [agents, setAgents] = useState<PtySession[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sessions = await globalThis.lazify.listSessions();
    setAgents(sessions.filter((session) => session.isAgent));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const send = async (session: PtySession) => {
    setBusyId(session.runId);

    const built = await globalThis.lazify.buildTaskPrompt(task.id);
    if (!built?.prompt.trim()) {
      setBusyId(null);
      return;
    }

    // Pasted rather than typed: a prompt is many lines, and a terminal submits
    // on every newline it is sent.
    pasteIntoTerminal(session.runId, built.prompt.trim());

    await globalThis.lazify.recordTaskRun({
      taskId: task.id,
      agentRunId: session.runId,
      agentLabel: session.scriptName,
      presetId: built.presetId,
      generatedPrompt: built.prompt.trim()
    });

    setBusyId(null);
    onSent(session);
    onClose();
  };

  return (
    <div
      className={clsx(
        "flex max-h-[80vh] w-[min(560px,92vw)] flex-col overflow-hidden",
        "rounded-2xl border border-border bg-bg shadow-2xl"
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
        <div className="min-w-0">
          <SectionTitle>{t(translation.Tasks.SendPrompt)}</SectionTitle>
          <CaptionText tone="muted" className="mt-0.5 block truncate">
            {task.name}
          </CaptionText>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={t(translation.GlobalTerm.Close)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-text/[0.06]"
        >
          <UiIcon name="xmark" className="h-4 w-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {agents.map((session) => (
          <button
            key={session.runId}
            type="button"
            disabled={busyId !== null}
            onClick={() => void send(session)}
            className={clsx(
              "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left",
              "hover:bg-text/[0.04] disabled:opacity-50"
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent">
              <UiIcon
                name={busyId === session.runId ? "refresh-circle" : "terminal"}
                className={clsx("h-4 w-4", busyId === session.runId && "animate-spin")}
              />
            </span>

            <div className="min-w-0 flex-1">
              <SmallText className="!text-text block truncate">{session.scriptName}</SmallText>
              <CaptionText tone="muted" className="block truncate">
                {session.projectName}
              </CaptionText>
            </div>

            <UiIcon name="arrow-right" className="h-3.5 w-3.5 shrink-0 text-muted" />
          </button>
        ))}

        {agents.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border text-muted">
              <UiIcon name="terminal" className="h-5 w-5" />
            </span>
            <CaptionText tone="muted">
              {t(translation.PromptBuilder.NoAgentRunning)}
            </CaptionText>
          </div>
        ) : null}
      </div>
    </div>
  );
}
