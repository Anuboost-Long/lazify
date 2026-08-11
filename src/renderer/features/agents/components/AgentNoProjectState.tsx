import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import {
  BodyText,
  CaptionText,
  OverlineText,
  PillText,
  SectionTitle,
} from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { AgentDescriptor } from "../../../../main/agents/agent-registry";
import { AgentGlyph } from "./AgentGlyph";

interface AgentNoProjectStateProps {
  agents: AgentDescriptor[];
  syncing: boolean;
  onSync: () => void;
}

function BackdropArt() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >

      <div className="absolute -left-12 -top-8 h-44 w-44 rotate-12 rounded-[32px] border border-border" />
      <div className="absolute -bottom-10 right-10 h-32 w-32 -rotate-6 rounded-[24px] border border-accent/20 bg-accent/[0.04]" />

      <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full border border-border" />

      <div className="absolute right-1/3 top-6 h-2.5 w-20 rotate-12 rounded-full bg-accent/10" />
      <div className="absolute bottom-8 left-1/4 h-2.5 w-14 -rotate-6 rounded-full bg-border" />

      <div className="absolute bottom-10 right-1/4 grid grid-cols-3 gap-1.5">
        {Array.from({ length: 9 }).map((_, index) => (
          <span key={index} className="h-1 w-1 rounded-full bg-muted/30" />
        ))}
      </div>
    </div>
  );
}

function SheetArt() {
  return (
    <div
      aria-hidden="true"
      className="relative h-[104px] w-[92px] shrink-0"
    >

      <div
        className={clsx(
          "absolute left-3 top-2 h-[88px] w-[68px] -rotate-6 rounded-[14px]",
          "border border-border bg-bg transition-transform duration-300",
          "group-hover:-rotate-12"
        )}
      />
      <div
        className={clsx(
          "absolute left-1.5 top-1 h-[92px] w-[72px] rotate-3 rounded-[14px]",
          "border border-border bg-soft transition-transform duration-300",
          "group-hover:rotate-6"
        )}
      />

      <div
        className={clsx(
          "absolute left-0 top-0 h-[96px] w-[76px] rounded-[14px]",
          "border border-accent/25 bg-bg transition-transform duration-300",
          "group-hover:-translate-y-1"
        )}
      >

        <div className="absolute right-0 top-0 h-5 w-5 rounded-bl-[10px] rounded-tr-[13px] border-b border-l border-accent/25 bg-accent/[0.07]" />

        <div className="flex flex-col gap-1.5 p-3 pt-6">
          <span className="h-1 w-10 rounded-full bg-muted/40" />
          <span className="h-1 w-12 rounded-full bg-muted/30" />
          <span className="h-1 w-8 rounded-full bg-muted/30" />
        </div>

        <div
          className={clsx(
            "absolute -bottom-3 left-3 flex h-8 w-8 items-center justify-center",
            "rounded-[11px] bg-accent text-white shadow-glow",
            "transition-transform duration-300 group-hover:rotate-[6deg]"
          )}
        >
          <UiIcon name="folder" className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

export function AgentNoProjectState({
  agents,
  syncing,
  onSync,
}: Readonly<AgentNoProjectStateProps>) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 items-center justify-center">
      <section
        className={clsx(
          "group relative w-full max-w-3xl overflow-hidden rounded-[24px]",
          "border border-border bg-soft p-6 shadow-panel md:p-8",
          "animate-fadeIn"
        )}
      >
        <BackdropArt />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
          <SheetArt />

          <div className="flex min-w-0 flex-col gap-3">
            <OverlineText className="!text-accent">
              {t(translation.Agents.Eyebrow)}
            </OverlineText>

            <SectionTitle>{t(translation.Workspace.NoSyncedYet)}</SectionTitle>

            <BodyText tone="muted" className="max-w-lg leading-6">
              {t(translation.Workspace.NoProjectsDesc)}
            </BodyText>

            {agents.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-2">
                {agents.map((agent, index) => (
                  <span
                    key={agent.id}
                    style={{ animationDelay: `${index * 60}ms` }}
                    className={clsx(
                      "flex items-center gap-2 rounded-full border px-3 py-1.5",
                      "animate-fadeIn transition-transform duration-300 hover:-translate-y-0.5",
                      agent.available
                        ? "border-accent/25 bg-accent/[0.06]"
                        : "border-border bg-bg"
                    )}
                  >
                    <AgentGlyph
                      agentId={agent.id}
                      image={agent.image}
                      className={clsx(
                        "h-3.5 w-3.5",
                        !agent.available && "opacity-40"
                      )}
                    />
                    <PillText>{agent.label}</PillText>
                    {agent.available ? null : (
                      <CaptionText as="span" tone="muted">
                        {t(translation.Agents.NotInstalled)}
                      </CaptionText>
                    )}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={syncing}
                onClick={onSync}
                className={clsx(
                  "group/sync inline-flex items-center gap-2 rounded-[18px] px-5 py-2.5",
                  "bg-accent text-sm font-semibold text-white shadow-glow",
                  "transition-all duration-300 hover:-translate-y-0.5 hover:bg-accentHover",
                  "active:scale-[0.98]",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  "disabled:hover:translate-y-0"
                )}
              >
                <UiIcon
                  name="refresh-circle"
                  className={clsx("h-4 w-4", syncing && "animate-spin")}
                />
                {t(translation.Workspace.SyncProject)}
                <UiIcon
                  name="arrow-right"
                  className="h-4 w-4 transition-transform duration-300 group-hover/sync:translate-x-0.5"
                />
              </button>

              <CaptionText tone="muted">
                {t(translation.Agents.NoProjects)}
              </CaptionText>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
