import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { PtySession } from "@renderer/shared/types/lazify";
import { CaptionText, SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface SendToAgentPickerProps {
  disabled: boolean;
  onSend: (session: PtySession) => void;
}

/**
 * Chooses which running agent the prompt goes to.
 *
 * The agents live on their own page, so the picker asks main which sessions are
 * running rather than assuming the one on screen.
 */
export function SendToAgentPicker({ disabled, onSend }: Readonly<SendToAgentPickerProps>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [agents, setAgents] = useState<PtySession[]>([]);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const loadAgents = useCallback(async () => {
    const sessions = await globalThis.lazify.listSessions();
    setAgents(sessions.filter((session) => session.isAgent));
  }, []);

  useEffect(() => {
    if (!open) return;

    void loadAgents();

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, loadAgents]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className={clsx(
          "flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-2",
          "text-[12px] text-accent hover:bg-accent/15",
          "disabled:cursor-not-allowed disabled:opacity-40"
        )}
      >
        <UiIcon name="play" className="h-3.5 w-3.5" />
        {t(translation.PromptBuilder.SendToAgent)}
      </button>

      {open ? (
        <div
          className={clsx(
            "absolute bottom-full right-0 z-20 mb-2 w-64 overflow-hidden",
            "rounded-xl border border-border bg-bg shadow-2xl"
          )}
        >
          {agents.length === 0 ? (
            <CaptionText tone="muted" className="block px-3 py-3">
              {t(translation.PromptBuilder.NoAgentRunning)}
            </CaptionText>
          ) : (
            agents.map((session) => (
              <button
                key={session.runId}
                type="button"
                onClick={() => {
                  onSend(session);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-text/[0.05]"
              >
                <UiIcon name="terminal" className="h-3 w-3 shrink-0 text-muted" />
                <div className="min-w-0 flex-1">
                  <SmallText className="!text-text block truncate">{session.scriptName}</SmallText>
                  <CaptionText tone="muted" className="block truncate">
                    {session.projectName}
                  </CaptionText>
                </div>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
