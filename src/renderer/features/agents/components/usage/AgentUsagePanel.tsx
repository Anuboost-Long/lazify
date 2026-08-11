import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { AgentUsageReport } from "@renderer/shared/types/lazify";
import { MonoText, SmallText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { AgentGlyph } from "../AgentGlyph";
import { railPanelShell, type RailPanelVariant } from "../rail-panel-shell";
import { formatTokens } from "./usage-format";
import { BlockRow, LimitBar, Sparkline, Stat } from "./UsageRows";

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

  return (
    <aside className={railPanelShell(variant)}>
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

