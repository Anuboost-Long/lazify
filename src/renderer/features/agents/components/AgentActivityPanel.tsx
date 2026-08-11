import clsx from "clsx";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { CaptionText, SmallText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { AutopilotHold } from "../../../../main/agents/autopilot-policy";
import type { AgentActivityEntry } from "../hooks/use-agent-activity";
import { railPanelShell, type RailPanelVariant } from "./rail-panel-shell";

interface AgentActivityPanelProps {
  entries: AgentActivityEntry[];

  projectPath: string;

  onMarkRead: () => void;
  onClear: () => void;

  onOpenRun: (entry: AgentActivityEntry) => void;
  onClose: () => void;

  autopilotEnabled: boolean;

  autopilotProjectEnabled: boolean;
  onToggleAutopilot: (next: boolean) => void;
  onToggleAutopilotProject: (next: boolean) => void;

  variant?: RailPanelVariant;
}

function timeOf(at: number) {
  return new Date(at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

const HOLD_LABELS: Record<AutopilotHold, string> = {
  critical: translation.Agents.AutopilotHoldCritical,
  opinion: translation.Agents.AutopilotHoldOpinion,
  "free-text": translation.Agents.AutopilotHoldFreeText,
  "no-safe-option": translation.Agents.AutopilotHoldNoSafeOption,
  widening: translation.Agents.AutopilotHoldWidening,
  repeat: translation.Agents.AutopilotHoldRepeat,
  "rate-limit": translation.Agents.AutopilotHoldRateLimit,
  unreadable: translation.Agents.AutopilotHoldUnreadable
};

function Switch({
  checked,
  label,
  onChange
}: Readonly<{ checked: boolean; label: string; onChange: (next: boolean) => void }>) {
  return (
    <label className="relative inline-flex shrink-0 cursor-pointer items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
        aria-label={label}
      />
      <span
        className={clsx(
          "h-4 w-7 rounded-full border",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40",
          checked ? "border-accent/40 bg-accent/30" : "border-border bg-text/[0.08]"
        )}
      />
      <span
        className={clsx(
          "pointer-events-none absolute left-0.5 h-3 w-3 rounded-full",
          "transition-transform duration-300",
          checked ? "translate-x-3 bg-accent" : "translate-x-0 bg-muted"
        )}
      />
    </label>
  );
}

export function AgentActivityPanel({
  entries,
  projectPath,
  onMarkRead,
  onClear,
  onOpenRun,
  onClose,
  autopilotEnabled,
  autopilotProjectEnabled,
  onToggleAutopilot,
  onToggleAutopilotProject,
  variant = "rail"
}: Readonly<AgentActivityPanelProps>) {
  const { t } = useTranslation();

  useEffect(() => onMarkRead(), [entries, onMarkRead]);

  return (
    <aside className={railPanelShell(variant)}>
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

      <div className="border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <UiIcon
            name={autopilotProjectEnabled ? "shield-check" : "shield-off"}
            className={clsx("h-3.5 w-3.5 shrink-0", autopilotProjectEnabled ? "text-accent" : "text-muted")}
          />

          <SmallText as="span" className="!text-text flex-1 truncate">
            {t(translation.Agents.Autopilot)}
          </SmallText>

          <Switch
            checked={autopilotEnabled}
            label={t(translation.Agents.AutopilotToggle)}
            onChange={onToggleAutopilot}
          />
        </div>

        <CaptionText tone="muted" className="mt-1 block leading-relaxed">
          {t(translation.Agents.AutopilotHint)}
        </CaptionText>

        {autopilotEnabled ? (
          <div className="mt-1.5 flex items-center gap-2">
            <SmallText as="span" className="!text-muted flex-1 truncate">
              {t(translation.Agents.AutopilotThisProject)}
            </SmallText>

            <Switch
              checked={autopilotProjectEnabled}
              label={t(translation.Agents.AutopilotThisProject)}
              onChange={onToggleAutopilotProject}
            />
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-1.5">
        {entries.length === 0 ? (
          <SmallText className="!text-muted px-1.5 py-2">
            {t(translation.Agents.ActivityEmpty)}
          </SmallText>
        ) : (
          entries.map((entry) => {
            const waiting = entry.kind === "waiting";
            const answered = entry.kind === "autopilot";

            const note = answered
              ? entry.optionLabel
              : entry.hold
                ? t(HOLD_LABELS[entry.hold])
                : null;

            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onOpenRun(entry)}
                className={clsx(
                  "flex w-full items-start gap-2 rounded-lg px-1.5 py-1 text-left",
                  "transition-colors hover:bg-text/[0.06]"
                )}
                title={entry.question ? `${entry.question}\n${entry.projectPath}` : entry.projectPath}
              >
                <UiIcon
                  name={answered ? "shield-check" : waiting ? "bell" : "check-circle"}
                  className={clsx(
                    "mt-0.5 h-3.5 w-3.5 shrink-0",
                    answered ? "text-muted" : waiting ? "text-accent" : "text-success"
                  )}
                />

                <span className="min-w-0 flex-1">
                  <SmallText as="span" className="!text-text block truncate">
                    {t(
                      answered
                        ? translation.Agents.AutopilotAnswered
                        : waiting
                          ? translation.Agents.NeedsAttention
                          : translation.Agents.TaskDone
                    )}
                  </SmallText>

                  {note ? (
                    <CaptionText
                      tone="muted"
                      className={clsx("block truncate", waiting && "!text-accent/80")}
                    >
                      {note}
                    </CaptionText>
                  ) : null}

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
