import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import type { AgentDescriptor } from "../../../../main/agents/agent-registry";
import type { MonitorPanels } from "../hooks/use-monitor-panels";
import { AgentMonitorGrid } from "./AgentMonitorGrid";
import { AgentMonitorRail } from "./AgentMonitorRail";
import type { AgentRailTab } from "./AgentTabBar";

interface AgentMonitorWallProps {
  projects: SyncedWorkspaceProject[];
  monitor: MonitorPanels;

  waitingRunIds: string[];

  availableAgents: AgentDescriptor[];
  onCreateAgent: (input: {
    label: string;
    command: string;
    image?: string;
  }) => Promise<void>;
  onDeleteAgent: (agentId: string) => Promise<void>;

  railTab: AgentRailTab | null;
  onToggleRail: (tab: AgentRailTab) => void;
  changeCount: number;
  activityUnread: number;
  onPickPath: (() => void) | null;
  onOpenConsole: () => void;
}

export function AgentMonitorWall({
  projects,
  monitor,
  waitingRunIds,
  availableAgents,
  onCreateAgent,
  onDeleteAgent,
  railTab,
  onToggleRail,
  changeCount,
  activityUnread,
  onPickPath,
  onOpenConsole,
}: Readonly<AgentMonitorWallProps>) {
  return (
    <AgentMonitorGrid
      projects={projects}
      panels={monitor.panels}
      onStart={monitor.start}
      onClear={monitor.clear}
      onSetSize={monitor.setSize}
      onRename={monitor.rename}
      onClearAll={monitor.clearAll}
      onReorder={monitor.reorder}
      columns={monitor.columns}
      onColumnsChange={monitor.setColumns}
      waitingRunIds={waitingRunIds}
      targetRunId={monitor.target?.runId ?? null}
      onSelectPanel={monitor.setTarget}
      rail={
        <AgentMonitorRail
          railTab={railTab}
          onToggleRail={onToggleRail}
          targetLabel={monitor.target?.projectName ?? null}
          changeCount={changeCount}
          activityUnread={activityUnread}
          onPickPath={onPickPath}
          onOpenConsole={onOpenConsole}
        />
      }
      availableAgents={availableAgents}
      onCreateAgent={onCreateAgent}
      onDeleteAgent={onDeleteAgent}
      onExit={() => monitor.setMonitorMode(false)}
    />
  );
}
