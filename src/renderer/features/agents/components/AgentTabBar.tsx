import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { SmallText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import { ConfirmModal } from "@renderer/shared/ui/modal/ConfirmModal";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { AgentDescriptor } from "../../../../main/agents/agent-registry";
import type { AgentTerminal } from "../hooks/agent-terminals";
import { AgentPickerModal } from "./agent-picker";
import { RunScriptPicker } from "./RunScriptPicker";
import { AgentTab } from "./tab-bar/AgentTab";

export type AgentRailTab = "changes" | "usage" | "files" | "debug" | "activity";

interface AgentTabBarProps {
  terminals: AgentTerminal[];
  activeTabId: string | null;
  availableAgents: AgentDescriptor[];

  runnableScript: string | null;

  allScripts: Record<string, string>;

  onSelectScript: (scriptName: string) => void;

  isScriptRunning: boolean;

  waitingTabIds: string[];

  previewOpen: boolean;

  previewActive: boolean;

  onSelectPreview: () => void;
  onClosePreview: () => void;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;

  onReorder: (fromTabId: string, toTabId: string) => void;

  onOpen: (agentId: string, resumeSessionId?: string) => void;

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
  waitingTabIds,
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

  const [pendingClose, setPendingClose] = useState<AgentTerminal | null>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const endDrag = () => {
    setDraggingId(null);
    setDropTargetId(null);
  };

  return (
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

        const draggingIndex = terminals.findIndex(
          (candidate) => candidate.tabId === draggingId
        );
        const dropsAfter = draggingIndex !== -1 && draggingIndex < index;

        return (
          <AgentTab
            key={terminal.tabId}
            terminal={terminal}
            availableAgents={availableAgents}
            isActive={isActive}
            isWaiting={isWaiting}
            isDragging={isDragging}
            isDropTarget={isDropTarget}
            dropsAfter={dropsAfter}
            dragActive={draggingId !== null}
            onSelect={onSelect}
            onRequestClose={setPendingClose}
            onDragStart={setDraggingId}
            onDragOver={setDropTargetId}
            onDragLeave={(tabId) =>
              setDropTargetId((current) => (current === tabId ? null : current))
            }
            onDrop={(tabId) => {
              if (draggingId) onReorder(draggingId, tabId);
              endDrag();
            }}
            onDragEnd={endDrag}
          />
        );
      })}

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
