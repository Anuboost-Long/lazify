import clsx from "clsx";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { SmallText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { AgentActivityEntry } from "../hooks/use-agent-activity";

interface AgentActivityPanelProps {
  entries: AgentActivityEntry[];
  /** The project on screen, so its own rows can be told from the others'. */
  projectPath: string;
  /** Marks everything currently listed as seen. */
  onMarkRead: () => void;
  onClear: () => void;
  /** Selects the run a row points at, switching project if it is elsewhere. */
  onOpenRun: (entry: AgentActivityEntry) => void;
  onClose: () => void;
}

/** Clock time is enough: the feed is about today, not about history. */
function timeOf(at: number) {
  return new Date(at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

/**
 * The log behind the alerts: every question asked and every turn finished,
 * across all projects, newest first. Deliberately not filtered to the selected
 * project — knowing which of the others wants you is the point.
 */
export function AgentActivityPanel({
  entries,
  projectPath,
  onMarkRead,
  onClear,
  onOpenRun,
  onClose
}: Readonly<AgentActivityPanelProps>) {
  const { t } = useTranslation();

  // On screen is read. Runs again as rows arrive while the panel is open, so
  // the badge does not come back for something the user is looking at.
  useEffect(() => onMarkRead(), [entries, onMarkRead]);

  return (
    <aside
      className={clsx(
        "flex w-72 shrink-0 flex-col overflow-hidden border-l border-border",
        "bg-text/[0.02]"
      )}
    >
      <header className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <UiIcon name="bell" className="ml-1 h-3.5 w-3.5 text-muted" />

        <SmallText as="span" className="!text-text truncate">
          {t(translation.Agents.Activity)}
        </SmallText>

        <div className="ml-auto flex items-center">
          {entries.length > 0 ? (
            <IconButton
              icon="trash"
              aria-label={t(translation.Agents.ActivityClear)}
              title={t(translation.Agents.ActivityClear)}
              onClick={onClear}
              className="text-text"
            />
          ) : null}
          <IconButton
            icon="xmark"
            aria-label={t(translation.GlobalTerm.Close)}
            onClick={onClose}
            className="text-text"
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-1.5">
        {entries.length === 0 ? (
          <SmallText className="!text-muted px-1.5 py-2">
            {t(translation.Agents.ActivityEmpty)}
          </SmallText>
        ) : (
          entries.map((entry) => {
            const waiting = entry.kind === "waiting";

            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onOpenRun(entry)}
                className={clsx(
                  "flex w-full items-start gap-2 rounded-lg px-1.5 py-1 text-left",
                  "transition-colors hover:bg-text/[0.06]"
                )}
                title={entry.projectPath}
              >
                <UiIcon
                  name={waiting ? "bell" : "check-circle"}
                  className={clsx(
                    "mt-0.5 h-3.5 w-3.5 shrink-0",
                    waiting ? "text-accent" : "text-success"
                  )}
                />

                <span className="min-w-0 flex-1">
                  <SmallText as="span" className="!text-text block truncate">
                    {t(
                      waiting
                        ? translation.Agents.NeedsAttention
                        : translation.Agents.TaskDone
                    )}
                  </SmallText>
                  {/* The project is what tells rows apart once several are
                      running, so it stays even on the selected one — only its
                      weight changes. */}
                  <SmallText
                    as="span"
                    className={clsx(
                      "block truncate",
                      entry.projectPath === projectPath ? "!text-text/70" : "!text-muted"
                    )}
                  >
                    {`${entry.agentLabel} · ${entry.projectName}`}
                  </SmallText>
                </span>

                <SmallText as="span" className="!text-muted shrink-0">
                  {timeOf(entry.at)}
                </SmallText>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
