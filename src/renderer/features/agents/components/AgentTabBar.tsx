import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { SmallText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { AgentDescriptor } from "../../../../main/agents/agent-registry";
import type { AgentTerminal } from "../hooks/use-agent-terminals";
import { AgentGlyph } from "./AgentGlyph";
import { AgentPickerModal } from "./AgentPickerModal";

interface AgentTabBarProps {
  terminals: AgentTerminal[];
  activeTabId: string | null;
  availableAgents: AgentDescriptor[];
  /** Script the run button launches, or null when the project has none. */
  runnableScript: string | null;
  /** Files touched since this project's agent session started. */
  changeCount: number;
  /** Which side rail is open, if any. */
  railTab: "changes" | "usage" | null;
  onToggleRail: (tab: "changes" | "usage") => void;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onOpen: (agentId: string) => void;
  onRun: () => void;
  onCreateAgent: (input: { label: string; command: string; image?: string }) => Promise<void>;
  onDeleteAgent: (agentId: string) => Promise<void>;
}

export function AgentTabBar({
  terminals,
  activeTabId,
  availableAgents,
  runnableScript,
  changeCount,
  railTab,
  onToggleRail,
  onSelect,
  onClose,
  onOpen,
  onRun,
  onCreateAgent,
  onDeleteAgent,
}: Readonly<AgentTabBarProps>) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    // The terminal panel is always dark, so this bar uses fixed light-on-dark
    // colours rather than theme tokens, which would vanish in light mode.
    <div
      className={clsx(
        "flex items-center gap-1 overflow-x-auto",
        "border-b border-white/10 px-2 py-1.5"
      )}
    >
      {terminals.map((terminal) => {
        const isActive = terminal.tabId === activeTabId;

        return (
          <div
            key={terminal.tabId}
            className={clsx(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 transition-colors",
              isActive
                ? "bg-white/[0.12] text-white"
                : "text-white hover:bg-white/[0.06]"
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(terminal.tabId)}
              className="flex items-center gap-2"
            >
              {terminal.kind === "script" ? (
                <UiIcon
                  name="play"
                  className={clsx("h-3.5 w-3.5", terminal.exited && "opacity-40")}
                />
              ) : (
                <AgentGlyph
                  agentId={terminal.sourceId}
                  image={availableAgents.find((agent) => agent.id === terminal.sourceId)?.image}
                  className={clsx("h-3.5 w-3.5", terminal.exited && "opacity-40")}
                />
              )}
              {/* Typography ships its own colour, so override it explicitly. */}
              <SmallText
                className={clsx("!text-white", terminal.exited && "line-through opacity-60")}
              >
                {terminal.label}
              </SmallText>
            </button>
            <IconButton
              icon="xmark"
              aria-label={t(translation.GlobalTerm.Close)}
              onClick={() => onClose(terminal.tabId)}
              className="text-white hover:bg-white/10 dark:hover:bg-white/10"
            />
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className={clsx(
          "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5",
          "text-white transition-colors hover:bg-white/[0.06]"
        )}
      >
        <UiIcon name="plus" className="h-3.5 w-3.5" />
        <SmallText className="!text-white">{t(translation.Agents.NewAgent)}</SmallText>
      </button>

      {runnableScript ? (
        <button
          type="button"
          onClick={onRun}
          className={clsx(
            "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5",
            "text-accent transition-colors hover:bg-white/[0.06]"
          )}
        >
          <UiIcon name="play" className="h-3.5 w-3.5" />
          <SmallText className="!text-accent">
            {`${t(translation.Agents.Run)} ${runnableScript}`}
          </SmallText>
        </button>
      ) : null}

      {/* Sticky so the rail toggles stay reachable once the tabs start scrolling. */}
      <div className="sticky right-0 ml-auto flex shrink-0 items-center gap-1 bg-[#0a0e17] pl-2">
        <button
          type="button"
          onClick={() => onToggleRail("changes")}
          className={clsx(
            "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5",
            "text-white transition-colors hover:bg-white/[0.06]",
            railTab === "changes" && "bg-white/[0.12]"
          )}
        >
          <UiIcon name="journal-page" className="h-3.5 w-3.5" />
          <SmallText className="!text-white">{t(translation.Agents.Changes)}</SmallText>
          {changeCount > 0 ? (
            <SmallText className="!text-accent">{changeCount}</SmallText>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => onToggleRail("usage")}
          className={clsx(
            "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5",
            "text-white transition-colors hover:bg-white/[0.06]",
            railTab === "usage" && "bg-white/[0.12]"
          )}
        >
          <UiIcon name="activity" className="h-3.5 w-3.5" />
          <SmallText className="!text-white">{t(translation.Agents.Usage)}</SmallText>
        </button>
      </div>

      <AgentPickerModal
        open={pickerOpen}
        agents={availableAgents}
        onSelect={onOpen}
        onClose={() => setPickerOpen(false)}
        onCreate={onCreateAgent}
        onDelete={onDeleteAgent}
      />
    </div>
  );
}
