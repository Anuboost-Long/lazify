import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { SmallText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { AgentDescriptor } from "../../../../../main/agents/agent-registry";
import type { AgentTerminal } from "../../hooks/agent-terminals";
import { AgentGlyph } from "../AgentGlyph";

export interface AgentTabProps {
  terminal: AgentTerminal;
  availableAgents: AgentDescriptor[];
  isActive: boolean;
  isWaiting: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  dropsAfter: boolean;
  dragActive: boolean;
  onSelect: (tabId: string) => void;
  onRequestClose: (terminal: AgentTerminal) => void;
  onDragStart: (tabId: string) => void;
  onDragOver: (tabId: string) => void;
  onDragLeave: (tabId: string) => void;
  onDrop: (tabId: string) => void;
  onDragEnd: () => void;
}

export function AgentTab({
  terminal,
  availableAgents,
  isActive,
  isWaiting,
  isDragging,
  isDropTarget,
  dropsAfter,
  dragActive,
  onSelect,
  onRequestClose,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: Readonly<AgentTabProps>) {
  const { t } = useTranslation();

  return (
    <div
      draggable
      onDragStart={(event) => {
        onDragStart(terminal.tabId);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", terminal.tabId);
      }}
      onDragOver={(event) => {
        if (!dragActive) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        onDragOver(terminal.tabId);
      }}
      onDragLeave={() => onDragLeave(terminal.tabId)}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(terminal.tabId);
      }}
      onDragEnd={onDragEnd}
      className={clsx(
        "relative flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 transition-colors",
        "cursor-grab active:cursor-grabbing",
        isActive ? "bg-text/[0.10] text-text" : "text-text hover:bg-text/[0.06]",
        isDragging && "opacity-40"
      )}
    >
      {isDropTarget ? (
        <span
          aria-hidden
          className={clsx(
            "absolute inset-y-1 w-0.5 rounded-full bg-accent",
            dropsAfter ? "-right-0.5" : "-left-0.5"
          )}
        />
      ) : null}

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

        <SmallText
          className={clsx("!text-text", terminal.exited && "line-through opacity-60")}
        >
          {terminal.label}
        </SmallText>

        {isWaiting ? (
          <span
            aria-hidden
            className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-accent"
          />
        ) : null}
      </button>

      <IconButton
        icon="xmark"
        aria-label={t(translation.GlobalTerm.Close)}
        onClick={() => onRequestClose(terminal)}
        className="text-text"
      />
    </div>
  );
}
