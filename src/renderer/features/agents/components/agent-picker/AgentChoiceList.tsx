import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { BodyText, CaptionText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";
import { AgentGlyph } from "../AgentGlyph";
import type { AgentDescriptor } from "../../../../../main/agents/agent-registry";

export interface AgentChoiceListProps {
  agents: AgentDescriptor[];
  projectPath: string;
  onSelect: (agentId: string) => void;
  onDelete: (event: React.MouseEvent, agentId: string) => void;
  onBrowse: () => void;
  onCreate: () => void;
}

export function AgentChoiceList({
  agents,
  projectPath,
  onSelect,
  onDelete,
  onBrowse,
  onCreate,
}: Readonly<AgentChoiceListProps>) {
  const { t } = useTranslation();

  return (
      <div className="flex flex-col gap-2 px-6 py-5">
        <CaptionText tone="muted">{t(translation.Agents.ChooseAgentDesc)}</CaptionText>

        {agents.map((agent) => (
          <div
            key={agent.id}
            className={clsx(
              "flex items-center gap-2 rounded-2xl border px-2 py-1",
              "border-border bg-bg transition-colors duration-150",
              agent.available
                ? "hover:border-accent/50 hover:bg-accent/[0.06]"
                : "opacity-45"
            )}
          >
            <button
              type="button"
              disabled={!agent.available}
              onClick={() => onSelect(agent.id)}
              className="flex flex-1 items-center justify-between gap-3 px-2 py-2 text-left disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    "flex h-9 w-9 shrink-0 items-center justify-center",
                    "rounded-xl border border-border bg-soft"
                  )}
                >
                  <AgentGlyph
                    agentId={agent.id}
                    image={agent.image}
                    className="h-[18px] w-[18px]"
                  />
                </div>
                <BodyText>{agent.label}</BodyText>
              </div>

              {agent.available ? (
                <UiIcon name="arrow-right" className="h-4 w-4 text-muted" />
              ) : (
                <CaptionText tone="muted">{t(translation.Agents.NotInstalled)}</CaptionText>
              )}
            </button>

            {agent.custom ? (
              <button
                type="button"
                aria-label={t(translation.Agents.RemoveAgent)}
                onClick={(event) => onDelete(event, agent.id)}
                className={clsx(
                  "mr-1 shrink-0 rounded-lg p-1.5 text-muted transition-colors duration-150",
                  "hover:bg-error/10 hover:text-error"
                )}
              >
                <UiIcon name="trash" className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ))}

        {projectPath ? (
          <button
            type="button"
            onClick={() => onBrowse()}
            className={clsx(
              "mt-1 flex items-center justify-center gap-2 rounded-2xl border px-4 py-3",
              "border-border text-muted transition-colors duration-150",
              "hover:border-accent/50 hover:text-accent"
            )}
          >
            <UiIcon name="refresh-circle" className="h-4 w-4" />
            <BodyText>{t(translation.Agents.ResumeSession)}</BodyText>
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => onCreate()}
          className={clsx(
            "mt-1 flex items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-3",
            "border-border text-muted transition-colors duration-150",
            "hover:border-accent/50 hover:text-accent"
          )}
        >
          <UiIcon name="plus" className="h-4 w-4" />
          <BodyText>{t(translation.Agents.AddCustomAgent)}</BodyText>
        </button>
    </div>
  );
}
