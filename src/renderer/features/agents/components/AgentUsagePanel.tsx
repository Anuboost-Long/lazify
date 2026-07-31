import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { AgentUsageReport, AgentUsageSummary } from "@renderer/shared/types/lazify";
import { MonoText, SmallText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { AgentGlyph } from "./AgentGlyph";

interface AgentUsagePanelProps {
  report: AgentUsageReport | null;
  loading: boolean;
  onRefresh: () => void;
  onSetBudget: (agentId: string, weeklyTokens: number) => void;
  onClose: () => void;
}

/** 1.2K / 3.4M / 2.5B — token counts get big enough that raw digits are noise. */
function formatTokens(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function formatReset(resetsAt: string | null): string | null {
  if (!resetsAt) return null;

  const minutes = Math.floor((Date.parse(resetsAt) - Date.now()) / 60_000);

  if (minutes <= 0) return null;
  if (minutes < 60) return `${minutes}m`;

  if (minutes < 48 * 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
  }

  const days = Math.floor(minutes / (24 * 60));
  const restHours = Math.floor((minutes % (24 * 60)) / 60);

  return restHours === 0 ? `${days}d` : `${days}d ${restHours}h`;
}

/** Past this age a reported window is shown as a last-known reading, not live. */
const STALE_READING_MS = 10 * 60_000;

/** Fill colour for a remaining-allowance bar: warns as the allowance runs out. */
function barToneClass(remainingPercent: number): string {
  if (remainingPercent <= 10) return "bg-rose-400";
  if (remainingPercent <= 30) return "bg-amber-400";
  return "bg-accent";
}

/** Percentage of an allowance still unspent, or null when there is nothing to measure against. */
function remainingOf(usedPercent: number | null): number | null {
  if (usedPercent === null) return null;

  return Math.min(Math.max(100 - usedPercent, 0), 100);
}

function Stat({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="min-w-0 flex-1">
      <SmallText as="span" className="!text-muted block truncate">
        {label}
      </SmallText>
      <MonoText as="span" className="!text-text block text-[11px]">
        {formatTokens(value)}
      </MonoText>
    </div>
  );
}

/** 14-day bar chart, scaled to the agent's own busiest day. */
function Sparkline({ history }: Readonly<{ history: AgentUsageSummary["history"] }>) {
  const recent = history.slice(-14);
  const peak = Math.max(...recent.map((day) => day.total), 1);

  if (recent.length === 0) return null;

  return (
    <div className="flex h-7 items-end gap-[2px]">
      {recent.map((day) => (
        <div
          key={day.date}
          title={`${day.date} · ${formatTokens(day.total)}`}
          className="flex-1 rounded-sm bg-accent/60"
          style={{ height: `${Math.max((day.total / peak) * 100, 4)}%` }}
        />
      ))}
    </div>
  );
}

/** Absolute reset time for the hover tooltip, in the viewer's own locale. */
function formatResetMoment(resetsAt: string): string {
  const reset = new Date(resetsAt);

  return `${reset.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ${reset.toLocaleTimeString(
    undefined,
    { hour: "numeric", minute: "2-digit" }
  )}`;
}

/** Spells out when a window rolls over: absolute moment first, countdown after. */
function ResetLine({ resetsAt }: Readonly<{ resetsAt: string | null }>) {
  const { t } = useTranslation();

  if (!resetsAt) return null;

  const countdown = formatReset(resetsAt);

  return (
    <SmallText as="span" className="!text-muted mt-1.5 block truncate">
      {`${t(translation.Agents.ResetsAt)} ${formatResetMoment(resetsAt)}${countdown ? ` · ${countdown}` : ""}`}
    </SmallText>
  );
}

/**
 * The rolling 5-hour block. Read-only: the percentage is whatever the agent
 * reports, and the reset moment is spelled out under the bar.
 */
function BlockRow({ agent }: Readonly<{ agent: AgentUsageSummary }>) {
  const { t } = useTranslation();

  const block = agent.sessionWindow;
  const remainingPercent = remainingOf(block?.usedPercent ?? null);
  const leftSuffix =
    remainingPercent === null
      ? ""
      : ` · ${Math.round(remainingPercent)}% ${t(translation.Agents.Left)}`;
  const windowLabel = block
    ? t(translation.Agents.BlockWindow)
    : t(translation.Agents.BlockIdle);
  const windowValue = block
    ? `${formatTokens(block.totals.total)}${leftSuffix}`
    : "—";
  const resetTooltip = block
    ? `${t(translation.Agents.ResetsAt)} ${formatResetMoment(block.resetsAt)}`
    : undefined;

  return (
    <div title={resetTooltip}>
      <div className="flex items-center justify-between gap-2">
        <SmallText as="span" className="!text-muted truncate">
          {windowLabel}
        </SmallText>
        <MonoText as="span" className="!text-muted shrink-0 text-[11px]">
          {windowValue}
        </MonoText>
      </div>

      {/* The bar shows what is left, so it drains as the window fills up. */}
      {block && remainingPercent !== null ? (
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-text/10">
          <div
            className={clsx("h-full rounded-full", barToneClass(remainingPercent))}
            style={{ width: `${Math.max(remainingPercent, 2)}%` }}
          />
        </div>
      ) : null}

      {block ? <ResetLine resetsAt={block.resetsAt} /> : null}
    </div>
  );
}

function LimitBar({
  agent,
  onSetBudget
}: Readonly<{ agent: AgentUsageSummary; onSetBudget: (weeklyTokens: number) => void }>) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (editing) {
    return (
      <form
        className="flex items-center gap-1"
        onSubmit={(event) => {
          event.preventDefault();
          // Entered in millions, which is the scale these budgets live at.
          onSetBudget(Math.round((Number.parseFloat(draft) || 0) * 1_000_000));
          setEditing(false);
        }}
      >
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t(translation.Agents.BudgetPlaceholder)}
          className={clsx(
            "min-w-0 flex-1 rounded border border-border bg-text/[0.06] px-1.5 py-0.5",
            "text-[11px] text-text outline-none placeholder:text-muted"
          )}
        />
        <IconButton
          icon="check-circle"
          type="submit"
          aria-label={t(translation.GlobalTerm.Save)}
          className="text-text"
        />
      </form>
    );
  }

  if (!agent.rateLimit) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft("");
          setEditing(true);
        }}
        className="text-left"
      >
        <SmallText as="span" className="!text-muted hover:!text-muted">
          {t(translation.Agents.SetBudget)}
        </SmallText>
      </button>
    );
  }

  const { usedPercent, source, resetsAt, planType, observedAt } = agent.rateLimit;
  const remainingPercent = remainingOf(usedPercent) ?? 0;
  const planSuffix = planType ? ` · ${planType}` : "";
  const limitLabel =
    source === "reported"
      ? `${t(translation.Agents.LimitLeft)}${planSuffix}`
      : t(translation.Agents.BudgetLeft);
  // A reported window can only be as current as the reading behind it: when the
  // account cannot be reached we fall back to whatever the agent last cached,
  // and that number must not pass for the live one.
  const observedMs = observedAt ? Date.parse(observedAt) : NaN;
  const staleSince =
    source === "reported" &&
    Number.isFinite(observedMs) &&
    Date.now() - observedMs > STALE_READING_MS
      ? formatResetMoment(observedAt as string)
      : null;
  const resetTooltip =
    [
      resetsAt ? `${t(translation.Agents.ResetsAt)} ${formatResetMoment(resetsAt)}` : null,
      staleSince ? `${t(translation.Agents.ReadingStale)} ${staleSince}` : null
    ]
      .filter(Boolean)
      .join(" · ") || undefined;
  const limitValue = `${Math.round(remainingPercent)}% ${t(translation.Agents.Left)}`;

  return (
    <button
      type="button"
      onClick={() => {
        // Only a self-imposed budget is editable; reported windows are facts.
        if (source === "budget") {
          setDraft(String((agent.weeklyBudget ?? 0) / 1_000_000));
          setEditing(true);
        }
      }}
      disabled={source === "reported"}
      title={resetTooltip}
      className="w-full text-left disabled:cursor-default"
    >
      <div className="flex items-center justify-between gap-2">
        <SmallText as="span" className="!text-muted truncate">
          {limitLabel}
        </SmallText>
        <MonoText as="span" className="!text-muted shrink-0 text-[11px]">
          {staleSince ? `~${limitValue}` : limitValue}
        </MonoText>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-text/10">
        <div
          className={clsx(
            "h-full rounded-full",
            barToneClass(remainingPercent),
            staleSince && "opacity-50"
          )}
          style={{ width: `${Math.max(remainingPercent, 2)}%` }}
        />
      </div>

      <ResetLine resetsAt={resetsAt} />
    </button>
  );
}

/**
 * Sits in the same rail as the changes panel and shares its dark styling.
 * Everything shown here is read from the agents' own local transcripts.
 */
export function AgentUsagePanel({
  report,
  loading,
  onRefresh,
  onSetBudget,
  onClose
}: Readonly<AgentUsagePanelProps>) {
  const { t } = useTranslation();

  return (
    <aside
      className={clsx(
        "flex w-72 shrink-0 flex-col overflow-hidden border-l border-border",
        "bg-text/[0.02]"
      )}
    >
      <header className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <UiIcon name="activity" className="ml-1 h-3.5 w-3.5 text-muted" />
        <SmallText as="span" className="!text-text truncate">
          {t(translation.Agents.Usage)}
        </SmallText>

        <div className="ml-auto flex items-center">
          <IconButton
            icon="refresh-circle"
            aria-label={t(translation.GlobalTerm.Refresh)}
            onClick={onRefresh}
            iconClassName={loading ? "animate-spin" : undefined}
            className="text-text"
          />
          <IconButton
            icon="xmark"
            aria-label={t(translation.GlobalTerm.Close)}
            onClick={onClose}
            className="text-text"
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-auto p-2">
        {report === null ? (
          <SmallText className="!text-muted px-1 py-2">
            {t(translation.GlobalTerm.Loading)}
          </SmallText>
        ) : (
          report.agents.map((agent) => (
            <section
              key={agent.agentId}
              className="space-y-2 rounded-xl border border-border bg-text/[0.03] p-2"
            >
              <div className="flex items-center gap-2">
                <AgentGlyph agentId={agent.agentId} className="h-3.5 w-3.5" />
                <SmallText as="span" className="!text-text truncate">
                  {agent.label}
                </SmallText>
                <MonoText as="span" className="!text-muted ml-auto shrink-0 text-[11px]">
                  {`${formatTokens(agent.allTime.total)} ${t(translation.Agents.AllTime)}`}
                </MonoText>
              </div>

              {agent.hasData ? (
                <>
                  <Sparkline history={agent.history} />

                  <div className="flex gap-2">
                    <Stat label={t(translation.Agents.SessionTokens)} value={agent.session.total} />
                    <Stat label={t(translation.Agents.Today)} value={agent.today.total} />
                    <Stat label={t(translation.Agents.Week)} value={agent.week.total} />
                  </div>
                </>
              ) : (
                <SmallText as="span" className="!text-muted block">
                  {t(translation.Agents.NoUsageData)}
                </SmallText>
              )}

              {agent.hasData ? (
                <BlockRow agent={agent} />
              ) : null}

              <LimitBar
                agent={agent}
                onSetBudget={(weeklyTokens) => onSetBudget(agent.agentId, weeklyTokens)}
              />
            </section>
          ))
        )}
      </div>
    </aside>
  );
}
