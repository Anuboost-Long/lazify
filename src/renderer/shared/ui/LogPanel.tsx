import clsx from "clsx";
import type { LogEntry } from "@renderer/shared/types/lazify";
import { translation } from "@renderer/i18n/translation";
import { BodyText, PageTitle, PillText, Typography } from "@renderer/shared/typography";
import { CodeField } from "./code/CodeField";
import UiIcon from "./icons/UiIcon";
import { useTranslation } from "react-i18next";
import { formatTime, useDateTimeFormat } from "@renderer/shared/hooks/use-date-time-format";

interface LogPanelProps {
  logs: LogEntry[];
}

const streamStyles: Record<LogEntry["stream"], string> = {
  stdout: "text-text",
  stderr: "text-text",
  system: "text-text"
};

export function LogPanel({ logs }: LogPanelProps) {
  const { t } = useTranslation();
  const { timeFormat } = useDateTimeFormat();

  return (
    <section
      className={clsx(
        "relative overflow-hidden",
        "rounded-shell border border-border bg-soft p-5",
        "shadow-panel backdrop-blur"
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px animate-pulseLine" style={{ background: "linear-gradient(to right, transparent, var(--color-accent), transparent)" }} />
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-full border border-border bg-bg p-2 text-accent">
            <UiIcon name="terminal" className="h-5 w-5" />
          </div>
          <div>
            <PageTitle className="text-2xl md:text-2xl">{t(translation.LogPanel.Title)}</PageTitle>
            <BodyText tone="muted">{t(translation.LogPanel.Subtitle)}</BodyText>
          </div>
        </div>
        <PillText tone="accent" className="rounded-full border border-border px-3 py-1 text-xs tracking-[0.24em]">
          {t(translation.LogPanel.EventsCount, { count: logs.length })}
        </PillText>
      </div>

      <CodeField
        revision={logs}
        className="h-[30rem] overflow-y-auto rounded-[22px] border border-border bg-bg px-4 py-3 font-mono text-sm shadow-inner"
      >
        {logs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted">
            <Typography as="span" variant="body" tone="inherit">{t(translation.LogPanel.Empty)}</Typography>
          </div>
        ) : (
          logs.map((entry) => (
            <div
              key={entry.key}
              data-code-line=""
              className={clsx(
                "whitespace-pre-wrap border-b border-border py-2 last:border-b-0",
                streamStyles[entry.stream]
              )}
            >
              <Typography as="span" variant="pill" data-code-ignore="" className="mr-3 text-muted">
                {formatTime(new Date(entry.timestamp), timeFormat)}
              </Typography>
              {entry.message}
            </div>
          ))
        )}
      </CodeField>
    </section>
  );
}
