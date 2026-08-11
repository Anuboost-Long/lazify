import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { BodyText, CaptionText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";
import { AgentGlyph } from "../AgentGlyph";
import type { AgentSessionSummary } from "../../../../../main/agents/agent-sessions";

export interface ResumeSessionListProps {
  sessions: AgentSessionSummary[] | null;
  resumable: AgentSessionSummary[];
  onSelect: (agentId: string, resumeSessionId?: string) => void;
}

export function ResumeSessionList({
  sessions,
  resumable,
  onSelect,
}: Readonly<ResumeSessionListProps>) {
  const { t } = useTranslation();

  return (
      <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto px-6 py-5">
        <CaptionText tone="muted">{t(translation.Agents.ResumeSessionDesc)}</CaptionText>

        {sessions === null ? (
          <CaptionText tone="muted">{t(translation.GlobalTerm.Loading)}</CaptionText>
        ) : resumable.length === 0 ? (
          <CaptionText tone="muted">{t(translation.Agents.ResumeSessionEmpty)}</CaptionText>
        ) : (
          resumable.map((session) => (
            <button
              key={`${session.agentId}-${session.sessionId}`}
              type="button"
              onClick={() => onSelect(session.agentId, session.sessionId)}
              className={clsx(
                "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left",
                "border-border bg-bg transition-colors duration-150",
                "hover:border-accent/50 hover:bg-accent/[0.06]"
              )}
            >
              <div
                className={clsx(
                  "flex h-9 w-9 shrink-0 items-center justify-center",
                  "rounded-xl border border-border bg-soft"
                )}
              >
                <AgentGlyph agentId={session.agentId} className="h-[18px] w-[18px]" />
              </div>

              <div className="min-w-0 flex-1">
                <BodyText className="truncate">
                  {session.title || t(translation.Agents.ResumeSessionUntitled)}
                </BodyText>
                <CaptionText tone="muted">
                  {new Date(session.updatedAt).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </CaptionText>
              </div>

              <UiIcon name="arrow-right" className="h-4 w-4 shrink-0 text-muted" />
            </button>
          ))
        )}
    </div>
  );
}
