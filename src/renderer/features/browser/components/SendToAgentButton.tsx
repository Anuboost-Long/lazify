import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { PtySession } from "@renderer/shared/types/lazify";
import { CaptionText, SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

/**
 * Hands the page you are looking at to an agent that is already running.
 *
 * The reason the browser lives in this app rather than in a second window: the
 * docs page and the thing reading it are one keystroke apart. The URL is typed
 * into the agent's prompt but deliberately not submitted — same convention as
 * the file picker, since the user usually has a sentence to write around it.
 */

interface SendToAgentButtonProps {
  /** Address of the page in the active tab, or empty on the start page. */
  url: string;
  title: string;
}

export function SendToAgentButton({ url, title }: Readonly<SendToAgentButtonProps>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [agents, setAgents] = useState<PtySession[]>([]);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const loadAgents = useCallback(async () => {
    const sessions = await globalThis.lazify.listSessions();
    // Only agents can be typed at; a dev server would just get gibberish.
    setAgents(sessions.filter((session) => session.isAgent));
  }, []);

  useEffect(() => {
    if (!open) return;

    void loadAgents();

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, loadAgents]);

  const send = (session: PtySession) => {
    // Trailing space, no newline: the agent sees the address as part of whatever
    // the user is still typing, rather than as a submitted message on its own.
    globalThis.lazify.ptyWrite(session.runId, `${url} `);
    setSentTo(session.runId);
    setOpen(false);
    setTimeout(() => setSentTo(null), 2000);
  };

  const disabled = !url;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        title={t(translation.Browser.SendToAgent)}
        aria-label={t(translation.Browser.SendToAgent)}
        aria-expanded={open}
        className={clsx(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
          disabled
            ? "cursor-not-allowed text-muted opacity-40"
            : "text-text hover:bg-text/[0.06]",
          open && "bg-text/[0.08]",
          sentTo && "text-accent"
        )}
      >
        <UiIcon name={sentTo ? "check-circle" : "chat-question"} className="h-3.5 w-3.5" />
      </button>

      {open ? (
        <div
          className={clsx(
            "absolute right-0 top-9 z-30 w-72 overflow-hidden rounded-2xl",
            "border border-border bg-bg shadow-panel"
          )}
        >
          <div className="border-b border-border px-4 py-2.5">
            <SmallText className="!text-text">{t(translation.Browser.SendToAgent)}</SmallText>
            <CaptionText tone="muted" className="mt-0.5 block truncate">
              {title || url}
            </CaptionText>
          </div>

          {agents.length === 0 ? (
            <CaptionText tone="muted" className="block px-4 py-3">
              {t(translation.Browser.NoAgentsRunning)}
            </CaptionText>
          ) : (
            <div className="max-h-64 overflow-y-auto py-1">
              {agents.map((session) => (
                <button
                  key={session.runId}
                  type="button"
                  onClick={() => send(session)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-text/[0.06]"
                >
                  <UiIcon name="code" className="h-3.5 w-3.5 shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <SmallText className="!text-text block truncate">
                      {session.scriptName}
                    </SmallText>
                    <CaptionText tone="muted" className="block truncate !text-[10px]">
                      {session.projectName}
                    </CaptionText>
                  </div>
                  {session.waiting ? (
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-accent"
                    />
                  ) : null}
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-border bg-soft px-4 py-2">
            <CaptionText tone="muted" className="block leading-relaxed">
              {t(translation.Browser.SendToAgentHint)}
            </CaptionText>
          </div>
        </div>
      ) : null}
    </div>
  );
}
