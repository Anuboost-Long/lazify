import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import { ConfirmModal } from "@renderer/shared/ui/modal/ConfirmModal";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { AgentDescriptor } from "../../../../../main/agents/agent-registry";
import type { MonitorColumns, MonitorPanel, MonitorPanelSize } from "../../hooks/use-monitor-panels";
import { AgentPickerModal } from "../agent-picker";
import { AgentMonitorLayoutModal } from "../AgentMonitorLayoutModal";
import { AgentMonitorRenameModal } from "../AgentMonitorRenameModal";
import { AgentMonitorSetupModal } from "../AgentMonitorSetupModal";
import { AgentMonitorSizeModal } from "../AgentMonitorSizeModal";

export interface MonitorModalsProps {
  projects: SyncedWorkspaceProject[];
  panelCount: number;
  renamingPanel: MonitorPanel | null;
  onRename: (runId: string, title: string) => void;
  onCloseRename: () => void;
  confirmingClearAll: boolean;
  onClearAll: () => void;
  onCloseClearAll: () => void;
  sizingPanel: MonitorPanel | null;
  onSetSize: (runId: string, size: MonitorPanelSize) => void;
  onCloseSize: () => void;
  pickingLayout: boolean;
  columns: MonitorColumns;
  onColumnsChange: (columns: MonitorColumns) => void;
  onCloseLayout: () => void;
  choosing: boolean;
  onCloseChoosing: () => void;
  onPickScript: (project: SyncedWorkspaceProject, scriptName: string) => void;
  onPickAgentRoute: (project: SyncedWorkspaceProject) => void;
  agentProject: SyncedWorkspaceProject | null;
  availableAgents: AgentDescriptor[];
  onSelectAgent: (agentId: string, resumeSessionId?: string) => void;
  onCloseAgentPicker: () => void;
  onCreateAgent: (input: { label: string; command: string; image?: string }) => Promise<void>;
  onDeleteAgent: (agentId: string) => Promise<void>;
}

export function MonitorModals({
  projects,
  panelCount,
  renamingPanel,
  onRename,
  onCloseRename,
  confirmingClearAll,
  onClearAll,
  onCloseClearAll,
  sizingPanel,
  onSetSize,
  onCloseSize,
  pickingLayout,
  columns,
  onColumnsChange,
  onCloseLayout,
  choosing,
  onCloseChoosing,
  onPickScript,
  onPickAgentRoute,
  agentProject,
  availableAgents,
  onSelectAgent,
  onCloseAgentPicker,
  onCreateAgent,
  onDeleteAgent,
}: Readonly<MonitorModalsProps>) {
  const { t } = useTranslation();

  return (
    <>
      <AgentMonitorRenameModal
        panel={renamingPanel}
        onRename={onRename}
        onClose={onCloseRename}
      />

      <ConfirmModal
        open={confirmingClearAll}
        title={t(translation.Agents.MonitorClearAll)}
        description={t(translation.Agents.MonitorClearAllDesc, { count: panelCount })}
        confirmLabel={t(translation.Agents.MonitorClearAllConfirm)}
        destructive
        onConfirm={onClearAll}
        onCancel={onCloseClearAll}
      />

      <AgentMonitorSizeModal
        panelLabel={sizingPanel?.displayName ?? null}
        current={sizingPanel?.size ?? "default"}
        onSelect={(size) => {
          if (sizingPanel) onSetSize(sizingPanel.runId, size);
        }}
        onClose={onCloseSize}
      />

      <AgentMonitorLayoutModal
        open={pickingLayout}
        columns={columns}
        onSelect={onColumnsChange}
        onClose={onCloseLayout}
      />

      <AgentMonitorSetupModal
        open={choosing}
        projects={projects}
        onClose={onCloseChoosing}
        onPickScript={onPickScript}
        onPickAgentRoute={onPickAgentRoute}
      />

      {agentProject ? (
        <AgentPickerModal
          open
          agents={availableAgents}
          projectPath={agentProject.projectPath}
          onSelect={onSelectAgent}
          onClose={onCloseAgentPicker}
          onCreate={onCreateAgent}
          onDelete={onDeleteAgent}
        />
      ) : null}
    </>
  );
}
