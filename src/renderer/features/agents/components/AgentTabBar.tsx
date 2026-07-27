import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { SmallText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import { ConfirmModal } from "@renderer/shared/ui/modal/ConfirmModal";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { AgentDescriptor } from "../../../../main/agents/agent-registry";
import type { AgentTerminal } from "../hooks/use-agent-terminals";
import { AgentGlyph } from "./AgentGlyph";
import { AgentPickerModal } from "./AgentPickerModal";
import { RunScriptPicker } from "./RunScriptPicker";

export type AgentRailTab = "changes" | "usage" | "files" | "debug" | "activity";

interface AgentTabBarProps {
  terminals: AgentTerminal[];
  activeTabId: string | null;
  availableAgents: AgentDescriptor[];
  /** Script the run button launches, or null when the project has none. */
  runnableScript: string | null;
  /** Every script the run button can be bound to, name -> command. */
  allScripts: Record<string, string>;
  /** Rebinds the run button to a chosen script. */
  onSelectScript: (scriptName: string) => void;
  /** True while the active tab is a live run, which hides the Run button. */
  isScriptRunning: boolean;
  /** Whether the Debug rail toggle is offered at all. */
  showDebug: boolean;
  /** Tabs whose agent is waiting on the user. */
  waitingTabIds: string[];
  /** Files touched since this project's agent session started. */
  changeCount: number;
  /** Alerts recorded since the activity feed was last looked at. */
  activityUnread: number;
  /** Which side rail is open, if any. */
  railTab: AgentRailTab | null;
  onToggleRail: (tab: AgentRailTab) => void;
  /** True while the preview has a tab of its own in the strip. */
  previewOpen: boolean;
  /** True while that tab is the one on screen. */
  previewActive: boolean;
  /** Opens the preview tab when there is none, and shows it either way. */
  onSelectPreview: () => void;
  onClosePreview: () => void;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
  /** Moves the dragged tab to the target tab's position. */
  onReorder: (fromTabId: string, toTabId: string) => void;
  /** Opens an agent, optionally resuming one of its past sessions. */
  onOpen: (agentId: string, resumeSessionId?: string) => void;
  /** Project the picker offers past sessions from. */
  projectPath: string;
  onRun: () => void;
  onCreateAgent: (input: { label: string; command: string; image?: string }) => Promise<void>;
  onDeleteAgent: (agentId: string) => Promise<void>;
}

export function AgentTabBar({
  terminals,
  activeTabId,
  availableAgents,
  runnableScript,
  allScripts,
  onSelectScript,
  isScriptRunning,
  showDebug,
  waitingTabIds,
  changeCount,
  activityUnread,
  railTab,
  onToggleRail,
  previewOpen,
  previewActive,
  onSelectPreview,
  onClosePreview,
  onSelect,
  onClose,
  onReorder,
  onOpen,
  projectPath,
  onRun,
  onCreateAgent,
  onDeleteAgent,
}: Readonly<AgentTabBarProps>) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  // Closing a tab kills its process, so the X asks first.
  const [pendingClose, setPendingClose] = useState<AgentTerminal | null>(null);
  // Tab being dragged, and the one it would drop onto.
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const endDrag = () => {
    setDraggingId(null);
    setDropTargetId(null);
  };

  return (
    // Theme tokens throughout: the terminal repaints itself for light and dark,
    // so its chrome has to follow the same way.
    <div
      className={clsx(
        "flex items-center gap-1 overflow-x-auto",
        "border-b border-border px-2 py-1.5"
      )}
    >
      {terminals.map((terminal, index) => {
        const isActive = terminal.tabId === activeTabId;
        const isWaiting = waitingTabIds.includes(terminal.tabId);
        const isDragging = terminal.tabId === draggingId;
        const isDropTarget = terminal.tabId === dropTargetId && !isDragging;
        // The insertion line sits on the edge the tab would arrive from.
        const draggingIndex = terminals.findIndex(
          (candidate) => candidate.tabId === draggingId
        );
        const dropsAfter = draggingIndex !== -1 && draggingIndex < index;

        return (
          <div
            key={terminal.tabId}
            draggable
            onDragStart={(event) => {
              setDraggingId(terminal.tabId);
              event.dataTransfer.effectAllowed = "move";
              // Firefox refuses to start a drag without payload.
              event.dataTransfer.setData("text/plain", terminal.tabId);
            }}
            onDragOver={(event) => {
              if (!draggingId) return;
              // Preventing the default is what marks this a valid drop target.
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setDropTargetId(terminal.tabId);
            }}
            onDragLeave={() => {
              setDropTargetId((current) =>
                current === terminal.tabId ? null : current
              );
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (draggingId) onReorder(draggingId, terminal.tabId);
              endDrag();
            }}
            onDragEnd={endDrag}
            className={clsx(
              "relative flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 transition-colors",
              "cursor-grab active:cursor-grabbing",
              isActive
                ? "bg-text/[0.10] text-text"
                : "text-text hover:bg-text/[0.06]",
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
              {/* Typography ships its own colour, so override it explicitly. */}
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
              onClick={() => setPendingClose(terminal)}
              className="text-text"
            />
          </div>
        );
      })}

      {/* The preview is a tab like any other, but it holds a page rather than a
          PTY — so it is not part of the reorderable terminal list, and closing
          it needs no confirmation. */}
      {previewOpen ? (
        <div
          className={clsx(
            "flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 transition-colors",
            previewActive
              ? "bg-text/[0.10] text-text"
              : "text-text hover:bg-text/[0.06]"
          )}
        >
          <button
            type="button"
            onClick={onSelectPreview}
            className="flex items-center gap-2"
          >
            <UiIcon
              name="globe"
              className={clsx("h-3.5 w-3.5", isScriptRunning && "text-accent")}
            />
            <SmallText className="!text-text">{t(translation.Agents.Preview)}</SmallText>
          </button>
          <IconButton
            icon="xmark"
            aria-label={t(translation.GlobalTerm.Close)}
            onClick={onClosePreview}
            className="text-text"
          />
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className={clsx(
          "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5",
          "text-text transition-colors hover:bg-text/[0.06]"
        )}
      >
        <UiIcon name="plus" className="h-3.5 w-3.5" />
        <SmallText className="!text-text">{t(translation.Agents.NewAgent)}</SmallText>
      </button>

      {Object.keys(allScripts).length > 0 && !isScriptRunning ? (
        <RunScriptPicker
          scripts={allScripts}
          selected={runnableScript}
          onRun={onRun}
          onSelect={onSelectScript}
        />
      ) : null}

      {/* Sticky so the rail toggles stay reachable once the tabs start scrolling. */}
      <div className="sticky right-0 ml-auto flex shrink-0 items-center gap-1 bg-soft pl-2">
        {/* Only offered once there is a run to control. */}
        {showDebug ? (
          <button
            type="button"
            onClick={() => onToggleRail("debug")}
            className={clsx(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5",
              "text-text transition-colors hover:bg-text/[0.06]",
              railTab === "debug" && "bg-text/[0.10]"
            )}
          >
            <UiIcon
              name="bug"
              className={clsx("h-3.5 w-3.5", isScriptRunning && "text-accent")}
            />
            <SmallText className="!text-text">{t(translation.Agents.Debug)}</SmallText>
          </button>
        ) : null}

        {/* Only an opener: once the preview has its own tab, that tab is how it
            is reached, so the toggle steps out of the way. */}
        {previewOpen ? null : (
          <button
            type="button"
            onClick={onSelectPreview}
            className={clsx(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5",
              "text-text transition-colors hover:bg-text/[0.06]"
            )}
          >
            <UiIcon
              name="globe"
              className={clsx("h-3.5 w-3.5", isScriptRunning && "text-accent")}
            />
            <SmallText className="!text-text">{t(translation.Agents.Preview)}</SmallText>
          </button>
        )}

        <button
          type="button"
          onClick={() => onToggleRail("changes")}
          className={clsx(
            "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5",
            "text-text transition-colors hover:bg-text/[0.06]",
            railTab === "changes" && "bg-text/[0.10]"
          )}
        >
          <UiIcon name="journal-page" className="h-3.5 w-3.5" />
          <SmallText className="!text-text">{t(translation.Agents.Changes)}</SmallText>
          {changeCount > 0 ? (
            <SmallText className="!text-accent">{changeCount}</SmallText>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => onToggleRail("files")}
          className={clsx(
            "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5",
            "text-text transition-colors hover:bg-text/[0.06]",
            railTab === "files" && "bg-text/[0.10]"
          )}
        >
          <UiIcon name="folder" className="h-3.5 w-3.5" />
          <SmallText className="!text-text">{t(translation.Agents.Files)}</SmallText>
        </button>

        <button
          type="button"
          onClick={() => onToggleRail("activity")}
          className={clsx(
            "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5",
            "text-text transition-colors hover:bg-text/[0.06]",
            railTab === "activity" && "bg-text/[0.10]"
          )}
        >
          <UiIcon name="bell" className="h-3.5 w-3.5" />
          <SmallText className="!text-text">{t(translation.Agents.Activity)}</SmallText>
          {activityUnread > 0 ? (
            <SmallText className="!text-accent">{activityUnread}</SmallText>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => onToggleRail("usage")}
          className={clsx(
            "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5",
            "text-text transition-colors hover:bg-text/[0.06]",
            railTab === "usage" && "bg-text/[0.10]"
          )}
        >
          <UiIcon name="activity" className="h-3.5 w-3.5" />
          <SmallText className="!text-text">{t(translation.Agents.Usage)}</SmallText>
        </button>
      </div>

      <ConfirmModal
        open={pendingClose !== null}
        title={t(translation.Agents.CloseTerminalTitle)}
        description={t(
          pendingClose?.exited
            ? translation.Agents.CloseTerminalExitedDesc
            : translation.Agents.CloseTerminalDesc,
          { label: pendingClose?.label ?? "" }
        )}
        confirmLabel={t(translation.GlobalTerm.Close)}
        destructive
        onConfirm={() => {
          if (pendingClose) onClose(pendingClose.tabId);
          setPendingClose(null);
        }}
        onCancel={() => setPendingClose(null)}
      />

      <AgentPickerModal
        open={pickerOpen}
        agents={availableAgents}
        projectPath={projectPath}
        onSelect={onOpen}
        onClose={() => setPickerOpen(false)}
        onCreate={onCreateAgent}
        onDelete={onDeleteAgent}
      />
    </div>
  );
}
