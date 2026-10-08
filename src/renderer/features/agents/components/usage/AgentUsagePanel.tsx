import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { AgentUsageReport, AgentUsageSummary } from "@renderer/shared/types/lazify";
import { MonoText, SectionTitle, SmallText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { AgentGlyph } from "../AgentGlyph";
import { railPanelShell, type RailPanelVariant } from "../rail-panel-shell";
import { formatTokens } from "./usage-format";
import { useState } from "react";

import { BlockRow, LimitBar, Sparkline, Stat, UsageHistoryChart } from "./UsageRows";

interface AgentUsagePanelProps {
  report: AgentUsageReport | null;
  loading: boolean;
  onRefresh: () => void;
  onSetBudget: (agentId: string, weeklyTokens: number) => void;
  onClose: () => void;

  variant?: RailPanelVariant;
}

export function AgentUsagePanel({
  report,
  loading,
  onRefresh,
  onSetBudget,
  onClose,
  variant = "rail"
}: Readonly<AgentUsagePanelProps>) {
  const { t } = useTranslation();
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
  const expandedAgent = report?.agents.find((agent) => agent.agentId === expandedAgentId) ?? null;

  return (
    <aside className={railPanelShell(variant)}>
      <header
        className={
          variant === "modal"
            ? "flex min-h-14 items-center gap-3 border-b border-border px-4"
            : "flex items-center gap-1 border-b border-border px-2 py-1.5"
        }
      >
        {expandedAgent ? (
          <IconButton
            icon="arrow-left"
            aria-label={t(translation.GlobalTerm.Back)}
            onClick={() => setExpandedAgentId(null)}
            className="text-text"
          />
        ) : (
          <UiIcon
            name="activity"
            className={variant === "modal" ? "h-4 w-4 text-accent" : "ml-1 h-3.5 w-3.5 text-muted"}
          />
        )}

        <div className={variant === "modal" ? "min-w-0 flex-1" : "min-w-0"}>
          {variant === "modal" ? (
            <SectionTitle as="span" className="!text-sm block leading-none truncate">
              {expandedAgent?.label ?? t(translation.Agents.Usage)}
            </SectionTitle>
          ) : (
            <SmallText as="span" className="!text-text block truncate">
              {expandedAgent?.label ?? t(translation.Agents.Usage)}
            </SmallText>
          )}
          {variant === "modal" && report && !expandedAgent ? (
            <MonoText as="span" className="!text-muted block text-[11px]">
              {`${formatTokens(report.agents.reduce((total, agent) => total + agent.week.total, 0))} ${t(translation.Agents.Week)}`}
            </MonoText>
          ) : null}
        </div>

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

      <div className="min-h-0 flex-1 overflow-auto">
        {report === null ? (
          <SmallText
            className={variant === "modal" ? "!text-muted block px-4 py-6" : "!text-muted px-1 py-2"}
          >
            {t(translation.GlobalTerm.Loading)}
          </SmallText>
        ) : (
          expandedAgent ? (
            <UsageHistory
              agent={expandedAgent}
              onSetBudget={(weeklyTokens) => onSetBudget(expandedAgent.agentId, weeklyTokens)}
            />
          ) : (
            <div className={variant === "rail" ? "space-y-2 p-2" : "divide-y divide-border"}>
              {report.agents.map((agent) => (
                <UsageAgent
                  key={agent.agentId}
                  variant={variant}
                  agent={agent}
                  onExpand={() => setExpandedAgentId(agent.agentId)}
                  onSetBudget={(weeklyTokens) => onSetBudget(agent.agentId, weeklyTokens)}
                />
              ))}
            </div>
          )
        )}
      </div>
    </aside>
  );
}

function UsageAgent({
  variant,
  agent,
  onExpand,
  onSetBudget,
}: Readonly<{
  variant: RailPanelVariant;
  agent: AgentUsageSummary;
  onExpand: () => void;
  onSetBudget: (weeklyTokens: number) => void;
}>) {
  const { t } = useTranslation();

  if (variant === "rail") {
    return (
      <section className="space-y-2 rounded-xl border border-border bg-text/[0.03] p-2">
        <div className="flex items-center gap-2">
          <AgentGlyph agentId={agent.agentId} className="h-3.5 w-3.5 shrink-0" />
          <SmallText as="span" className="!text-text truncate">
            {agent.label}
          </SmallText>
          <MonoText as="span" className="!text-muted ml-auto shrink-0 text-[11px]">
            {`${formatTokens(agent.allTime.total)} ${t(translation.Agents.AllTime)}`}
          </MonoText>
        </div>

        {agent.hasData ? (
          <>
            <Sparkline history={agent.history} onExpand={onExpand} />

            <div className="flex gap-2">
              <Stat label={t(translation.Agents.SessionTokens)} value={agent.session.total} />
              <Stat label={t(translation.Agents.Today)} value={agent.today.total} />
              <Stat label={t(translation.Agents.Week)} value={agent.week.total} />
            </div>

            <BlockRow agent={agent} />
          </>
        ) : (
          <SmallText as="span" className="!text-muted block">
            {t(translation.Agents.NoUsageData)}
          </SmallText>
        )}

        <LimitBar agent={agent} onSetBudget={onSetBudget} />
      </section>
    );
  }

  return (
    <section className="grid grid-cols-[10rem_minmax(0,1fr)] gap-4 px-4 py-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <AgentGlyph agentId={agent.agentId} className="h-4 w-4 shrink-0" />
          <SmallText as="span" className="!text-text truncate">
            {agent.label}
          </SmallText>
        </div>
        <MonoText as="span" className="!text-muted mt-1 block text-[11px]">
          {`${formatTokens(agent.allTime.total)} ${t(translation.Agents.AllTime)}`}
        </MonoText>
      </div>

      {agent.hasData ? (
        <div className="min-w-0 space-y-3">
          <Sparkline history={agent.history} onExpand={onExpand} />

          <div className="grid grid-cols-3 divide-x divide-border border-y border-border">
            <Stat label={t(translation.Agents.SessionTokens)} value={agent.session.total} />
            <Stat label={t(translation.Agents.Today)} value={agent.today.total} />
            <Stat label={t(translation.Agents.Week)} value={agent.week.total} />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <BlockRow agent={agent} />
            <LimitBar agent={agent} onSetBudget={onSetBudget} />
          </div>
        </div>
      ) : (
        <SmallText as="span" className="!text-muted">
          {t(translation.Agents.NoUsageData)}
        </SmallText>
      )}
    </section>
  );
}

function UsageHistory({
  agent,
  onSetBudget,
}: Readonly<{
  agent: AgentUsageSummary;
  onSetBudget: (weeklyTokens: number) => void;
}>) {
  const { t } = useTranslation();

  return (
    <section className="min-h-[32rem] space-y-5 px-4 py-5">
      <div className="flex items-center gap-2">
        <AgentGlyph agentId={agent.agentId} className="h-4 w-4 shrink-0" />
        <SmallText as="span" className="!text-text truncate">
          {agent.label}
        </SmallText>
        <MonoText as="span" className="!text-muted ml-auto shrink-0 text-[11px]">
          {`${formatTokens(agent.allTime.total)} ${t(translation.Agents.AllTime)}`}
        </MonoText>
      </div>

      <UsageHistoryChart history={agent.history} />

      <div className="grid grid-cols-3 divide-x divide-border border-y border-border">
        <Stat label={t(translation.Agents.SessionTokens)} value={agent.session.total} />
        <Stat label={t(translation.Agents.Today)} value={agent.today.total} />
        <Stat label={t(translation.Agents.Week)} value={agent.week.total} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <BlockRow agent={agent} />
        <LimitBar agent={agent} onSetBudget={onSetBudget} />
      </div>
    </section>
  );
}
