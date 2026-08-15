import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { PtySession } from "@renderer/shared/types/lazify";
import { CaptionText, SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface RunningAgentListProps {
  agents: PtySession[];
  onSelect: (session: PtySession) => void;
  onStartNew: () => void;
}

export function RunningAgentList({
  agents,
  onSelect,
  onStartNew
}: Readonly<RunningAgentListProps>) {
  const { t } = useTranslation();

  return (
    <>
      <div className="max-h-64 overflow-y-auto py-1">
        {agents.map((session) => (
          <button
            key={session.runId}
            type="button"
            onClick={() => onSelect(session)}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-text/[0.06]"
          >
            <UiIcon name="code" className="h-3.5 w-3.5 shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <SmallText className="!text-text block truncate">{session.scriptName}</SmallText>
              <CaptionText tone="muted" className="block truncate !text-[10px]">
                {session.projectName}
              </CaptionText>
            </div>
            {session.waiting ? (
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-accent"
                title={t(translation.Agents.NeedsAttention)}
              />
            ) : null}
          </button>
        ))}
      </div>

      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={onStartNew}
          className={clsx(
            "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left",
            "transition-colors hover:bg-accent/10 hover:text-accent"
          )}
        >
          <UiIcon name="plus" className="h-3.5 w-3.5 shrink-0" />
          <SmallText as="span" className="!text-inherit">
            {t(translation.Agents.SendToNewAgent)}
          </SmallText>
        </button>
      </div>
    </>
  );
}
