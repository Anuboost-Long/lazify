import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { PtySession } from "@renderer/shared/types/lazify";
import { CaptionText, OverlineText, SectionTitle } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";
import { pasteIntoTerminal } from "@renderer/shared/lib/terminal-paste";
import type { CodeSelectionContext } from "@renderer/shared/ui/code/menu/code-selection";
import type { AgentDescriptor } from "../../../../../main/agents/agent-registry";
import { AgentPickerModal } from "../agent-picker";
import { buildCodePayload, formatCodeReference } from "../../utils/code-payload";
import { RunningAgentList } from "./RunningAgentList";

export interface AgentPayload {
  /** What the dialog calls the errand, so the user sees what is being sent. */
  title: string;
  text: string;
  /** Press return after pasting, so the agent starts without a second trip. */
  submit?: boolean;
}

interface SendToAgentDialogProps {
  selection: CodeSelectionContext | null;
  filePath?: string | null;
  /** Text prepared elsewhere, for callers with neither a selection nor a file. */
  payload?: AgentPayload | null;
  projectPath: string;
  agents: AgentDescriptor[];
  onStartAgent: (agentId: string, resumeSessionId?: string) => Promise<string | null>;
  onCreateAgent: (input: { label: string; command: string; image?: string }) => Promise<void>;
  onDeleteAgent: (agentId: string) => Promise<void>;
  onSent?: (runId: string) => void;
  onClose: () => void;
}

const READY_GRACE_MS = 700;
const READY_TIMEOUT_MS = 5000;

const SUBMIT_DELAY_MS = 200;

function paste(runId: string, text: string, submit: boolean) {
  pasteIntoTerminal(runId, text);

  if (submit) setTimeout(() => globalThis.lazify.ptyWrite(runId, "\r"), SUBMIT_DELAY_MS);
}

function pasteWhenReady(runId: string, payload: string, submit: boolean) {
  let sent = false;
  let grace: ReturnType<typeof setTimeout> | null = null;

  const send = () => {
    if (sent) return;
    sent = true;
    if (grace) clearTimeout(grace);
    clearTimeout(timeout);
    stop();
    paste(runId, payload, submit);
  };

  const stop = globalThis.lazify.onPtyData((event) => {
    if (event.runId !== runId || grace) return;
    grace = setTimeout(send, READY_GRACE_MS);
  });

  const timeout = setTimeout(send, READY_TIMEOUT_MS);
}

export function SendToAgentDialog({
  selection,
  filePath = null,
  payload = null,
  projectPath,
  agents,
  onStartAgent,
  onCreateAgent,
  onDeleteAgent,
  onSent,
  onClose
}: Readonly<SendToAgentDialogProps>) {
  const { t } = useTranslation();
  const [running, setRunning] = useState<PtySession[] | null>(null);
  const [picking, setPicking] = useState(false);

  const open = selection !== null || filePath !== null || payload !== null;

  useEffect(() => {
    if (!open) {
      setRunning(null);
      setPicking(false);
      return;
    }

    let cancelled = false;

    void globalThis.lazify.listSessions().then((sessions) => {
      if (cancelled) return;

      const mine = sessions.filter(
        (session) => session.isAgent && session.projectPath === projectPath
      );

      setRunning(mine);
      if (mine.length === 0) setPicking(true);
    });

    return () => {
      cancelled = true;
    };
  }, [open, projectPath]);

  const send = useCallback(
    (runId: string, ready: boolean) => {
      const text = selection ? buildCodePayload(selection) : (payload?.text ?? filePath);
      if (!text) return;

      if (ready) paste(runId, text, payload?.submit ?? false);
      else pasteWhenReady(runId, text, payload?.submit ?? false);

      onSent?.(runId);
      onClose();
    },
    [selection, filePath, payload, onSent, onClose]
  );

  const handleStart = useCallback(
    async (agentId: string, resumeSessionId?: string) => {
      const runId = await onStartAgent(agentId, resumeSessionId);

      if (runId) send(runId, false);
      else onClose();
    },
    [onStartAgent, send, onClose]
  );

  if (!open) return null;

  if (picking) {
    return (
      <AgentPickerModal
        open
        agents={agents}
        projectPath={projectPath}
        onSelect={(agentId, resumeSessionId) => void handleStart(agentId, resumeSessionId)}
        onClose={onClose}
        onCreate={onCreateAgent}
        onDelete={onDeleteAgent}
        onBack={running && running.length > 0 ? () => setPicking(false) : undefined}
      />
    );
  }

  if (running === null) return null;

  return (
    <BaseModal open onClose={onClose}>
      <div
        className={clsx(
          "w-[400px] max-w-[calc(100vw-2rem)] overflow-hidden",
          "rounded-shell border border-border bg-soft shadow-panel"
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <OverlineText className="text-muted">
              {t(translation.Agents.SendToAgent)}
            </OverlineText>
            <SectionTitle className="mt-1 truncate text-lg">
              {selection
                ? formatCodeReference(selection, projectPath) ||
                  t(translation.Agents.SendSelection)
                : (payload?.title ?? filePath)}
            </SectionTitle>
            {selection ? (
              <CaptionText tone="muted" className="mt-1 block">
                {t(translation.Agents.SendSelectionLines, {
                  count: selection.endLine - selection.startLine + 1
                })}
              </CaptionText>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t(translation.GlobalTerm.Close)}
            className={clsx(
              "shrink-0 rounded-xl border border-border bg-bg p-2 transition-colors",
              "text-muted hover:border-accent/30 hover:text-text"
            )}
          >
            <UiIcon name="xmark" className="h-4 w-4" />
          </button>
        </div>

        <RunningAgentList
          agents={running}
          onSelect={(session) => send(session.runId, true)}
          onStartNew={() => setPicking(true)}
        />

        <div className="border-t border-border bg-bg/40 px-5 py-2.5">
          <CaptionText tone="muted" className="block leading-relaxed">
            {t(
              selection
                ? translation.Agents.SendToAgentHint
                : translation.Agents.SendFilePathHint
            )}
          </CaptionText>
        </div>
      </div>
    </BaseModal>
  );
}
