import clsx from "clsx";
import type { LogEntry } from "@renderer/shared/types/lazify";
import UiIcon from "./icons/UiIcon";

interface LogPanelProps {
  logs: LogEntry[];
}

const streamStyles: Record<LogEntry["stream"], string> = {
  stdout: "text-white",
  stderr: "text-white",
  system: "text-white"
};

export function LogPanel({ logs }: LogPanelProps) {
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
            <p className="font-display text-2xl text-text">Live Console</p>
            <p className="text-sm text-muted">Streamed directly from the Electron main process.</p>
          </div>
        </div>
        <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
          {logs.length} events
        </span>
      </div>

      <div className="h-[30rem] overflow-y-auto rounded-[22px] border border-border bg-black px-4 py-3 font-mono text-sm shadow-inner">
        {logs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-white/70">
            Command output will appear here.
          </div>
        ) : (
          logs.map((entry) => (
            <div
              key={entry.key}
              className={clsx(
                "whitespace-pre-wrap border-b border-white/10 py-2 last:border-b-0",
                streamStyles[entry.stream]
              )}
            >
              <span className="mr-3 text-xs uppercase tracking-[0.24em] text-white/45">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              {entry.message}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
